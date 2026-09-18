import "dotenv/config";
import path from "node:path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  isJidGroup,
  isLidUser,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import prisma from "@/lib/prisma";
import { AccountService } from "@/servers/services/account.service";
import { GroupService } from "@/servers/services/group.service";
import { JobApplicationService } from "@/servers/services/job-application.service";
import { parseJobDump } from "@/lib/ai/parse-job-dump";
import { ApplicationSource } from "@/generated/prisma";
import { format } from "date-fns";

/** Prefix that triggers an AI-dump add — e.g. "/loker Backend Engineer @ Acme, remote, ...". */
const TRIGGER_PREFIX = "/loker";
/** Sent by any member (even unlinked ones) to reveal a group chat's JID for setup. */
const ID_COMMAND = "/id";
/** Replies with the sender's own job-tracking summary for this group's board. */
const ME_COMMAND = "/me";

const AUTH_DIR = path.join(__dirname, "auth");
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || "warn" });

/** Some groups address participants by an opaque `@lid` instead of their phone
 * number — when that's the case, Baileys puts the real phone-number JID in
 * `participantPn` instead. See Baileys' LID/PN addressing-mode docs. */
function resolveSenderPhoneJid(msg: WAMessage): string | undefined {
  const participant = msg.key.participant ?? msg.key.remoteJid;
  if (!participant) return undefined;
  if (isLidUser(participant)) return msg.key.participantPn;
  return participant;
}

/** "6281234567890@s.whatsapp.net" (or with a ":device" suffix) -> "+6281234567890". */
function jidToE164(jid: string): string {
  const user = jid.split("@")[0].split(":")[0];
  return `+${user}`;
}

function extractText(msg: WAMessage): string | undefined {
  const m = msg.message;
  if (!m) return undefined;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    undefined
  );
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Scan this QR code with the bot's WhatsApp account:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed", statusCode, shouldReconnect ? "— reconnecting" : "— logged out");
      if (shouldReconnect) connect();
    } else if (connection === "open") {
      console.log("Connected to WhatsApp.");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        await handleMessage(sock, msg);
      } catch (error) {
        console.error("Failed to handle message", error);
      }
    }
  });
}

async function handleMessage(sock: ReturnType<typeof makeWASocket>, msg: WAMessage) {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || !isJidGroup(remoteJid) || msg.key.fromMe) return;

  const text = extractText(msg)?.trim();
  if (!text) return;

  const reply = (t: string) => sock.sendMessage(remoteJid, { text: t }, { quoted: msg });
  const lowerText = text.toLowerCase();

  if (lowerText === ID_COMMAND) {
    await reply(`Group JID: ${remoteJid}`);
    return;
  }

  const isMeCommand = lowerText === ME_COMMAND;
  const isLokerCommand = lowerText.startsWith(TRIGGER_PREFIX);
  if (!isMeCommand && !isLokerCommand) return;

  const group = await GroupService.findByWhatsappJid(remoteJid);
  if (!group) {
    await reply(
      "This group isn't linked to an Adaloker board yet. Ask the group owner to link it from Group settings (send \"/id\" here to get the JID to paste).",
    );
    return;
  }

  const senderPhoneJid = resolveSenderPhoneJid(msg);
  if (!senderPhoneJid) {
    await reply("Couldn't identify your WhatsApp number from this message — try again.");
    return;
  }

  const account = await AccountService.findByWhatsappPhone(jidToE164(senderPhoneJid));
  if (!account) {
    await reply(
      "I don't recognize this number. Link it in your Adaloker profile (Profile > WhatsApp bot) with the same number you're messaging from, then try again.",
    );
    return;
  }

  const membership = await GroupService.getMembership(group.id, account.id);
  if (!membership) {
    await reply(`You're not a member of the "${group.name}" board on Adaloker.`);
    return;
  }

  if (isMeCommand) {
    const overview = await JobApplicationService.getMemberOverview(group.id, account.id);

    const lines = [
      `📊 Your job tracking in "${group.name}"`,
      `Total loker: ${overview.total}`,
      `Wishlisted: ${overview.wishlisted}`,
      overview.latest
        ? `Latest loker: ${overview.latest.position} @ ${overview.latest.company} (${format(overview.latest.createdAt, "MMM d, yyyy")})`
        : "Latest loker: none yet",
      overview.nearestInterview
        ? `Nearest wawancara: ${overview.nearestInterview.application.position} @ ${overview.nearestInterview.application.company} — ${format(overview.nearestInterview.appliedAt!, "MMM d, yyyy")}`
        : "Nearest wawancara: none scheduled",
    ];

    await reply(lines.join("\n"));
    return;
  }

  const dumpText = text.slice(TRIGGER_PREFIX.length).trim();
  if (!dumpText) {
    await reply(`Send "${TRIGGER_PREFIX}" followed by the job posting/email/notes to add it.`);
    return;
  }

  let extracted;
  try {
    extracted = await parseJobDump(dumpText);
  } catch {
    await reply("Couldn't parse that into a job application — try including more details (company, role, etc).");
    return;
  }

  await JobApplicationService.create({
    groupId: group.id,
    createdById: account.id,
    company: extracted.company,
    position: extracted.position,
    location: extracted.location,
    jobUrl: extracted.jobUrl,
    salary: extracted.salary,
    sourcePlatform: extracted.sourcePlatform,
    status: extracted.status,
    appliedAt: extracted.appliedAt ? new Date(extracted.appliedAt) : null,
    notes: extracted.notes,
    source: ApplicationSource.AI_DUMP,
    rawDumpText: dumpText,
  });

  const lines = [
    `Added to "${group.name}" ✅`,
    `${extracted.position} @ ${extracted.company}`,
    extracted.location ? `Location: ${extracted.location}` : undefined,
    extracted.salary ? `Salary: ${extracted.salary}` : undefined,
    extracted.sourcePlatform ? `Source: ${extracted.sourcePlatform}` : undefined,
    `Status: ${extracted.status}`,
    extracted.notes ? `Notes: ${extracted.notes}` : undefined,
  ].filter(Boolean);

  await reply(lines.join("\n"));
}

connect().catch((error) => {
  console.error("Failed to start WhatsApp bot", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
