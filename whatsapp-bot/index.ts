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
import { fetchPageText } from "@/lib/fetch-page-text";
import { ApplicationSource, ApplicationStatus } from "@/generated/prisma";
import { format } from "date-fns";

/** Prefix that triggers an AI-dump add — e.g. "/loker Backend Engineer @ Acme, remote, ...",
 * or "/loker https://..." to scrape a job posting URL (same as the web app's URL tab). */
const TRIGGER_PREFIX = "/loker";
/** Sent by any member (even unlinked ones) to reveal a group chat's JID for setup. */
const ID_COMMAND = "/id";
/** Lists every bot command — works anywhere, even before the group/number is linked. */
const HELP_COMMAND = "/help";
/** Replies with the sender's own job-tracking summary for this group's board. */
const ME_COMMAND = "/me";
/** Lists the group's board newest first — "/list" (default count), "/list 20", "/list all". */
const LIST_COMMAND = "/list";
const LIST_DEFAULT_COUNT = 10;
/** Changes the sender's own status on one loker by its "/list" number — "/set 12 applied". */
const SET_COMMAND = "/set";

/** Words accepted by "/set" (lowercased, spaces/dashes/underscores stripped), including
 * the Indonesian ones the group actually types. */
const STATUS_ALIASES: Record<string, ApplicationStatus> = {
  wishlist: ApplicationStatus.WISHLIST,
  apply: ApplicationStatus.APPLIED,
  applied: ApplicationStatus.APPLIED,
  lamar: ApplicationStatus.APPLIED,
  oa: ApplicationStatus.OA,
  interview: ApplicationStatus.INTERVIEW,
  wawancara: ApplicationStatus.INTERVIEW,
  offer: ApplicationStatus.OFFER,
  rejected: ApplicationStatus.REJECTED,
  reject: ApplicationStatus.REJECTED,
  ditolak: ApplicationStatus.REJECTED,
  tolak: ApplicationStatus.REJECTED,
  ghosted: ApplicationStatus.GHOSTED,
  ghost: ApplicationStatus.GHOSTED,
  withdrawn: ApplicationStatus.WITHDRAWN,
  withdraw: ApplicationStatus.WITHDRAWN,
  notinterested: ApplicationStatus.NOT_INTERESTED,
  skip: ApplicationStatus.NOT_INTERESTED,
};
/** A dump that's nothing but a single http(s) link is scraped instead of parsed as-is. */
const LONE_URL_PATTERN = /^https?:\/\/\S+$/i;

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

  if (lowerText === HELP_COMMAND) {
    await reply(
      [
        "🤖 Adaloker bot commands",
        `${TRIGGER_PREFIX} <text> — add a loker from a job posting/notes`,
        `${TRIGGER_PREFIX} <link> — add a loker by scraping the job page`,
        `${LIST_COMMAND} — newest 10 loker (${LIST_COMMAND} 20, ${LIST_COMMAND} all for more)`,
        `${SET_COMMAND} <#> <status> — change your status, e.g. ${SET_COMMAND} 12 lamar`,
        "   statuses: wishlist, applied/lamar, oa, interview/wawancara, offer, rejected/ditolak, ghosted, withdrawn, notinterested",
        `${ME_COMMAND} — your summary on this board`,
        `${ID_COMMAND} — this group's JID (for linking in Group settings)`,
        `${HELP_COMMAND} — this list`,
      ].join("\n"),
    );
    return;
  }

  if (lowerText === ID_COMMAND) {
    await reply(`Group JID: ${remoteJid}`);
    return;
  }

  const isMeCommand = lowerText === ME_COMMAND;
  const isListCommand = lowerText === LIST_COMMAND || lowerText.startsWith(`${LIST_COMMAND} `);
  const isSetCommand = lowerText === SET_COMMAND || lowerText.startsWith(`${SET_COMMAND} `);
  const isLokerCommand = lowerText.startsWith(TRIGGER_PREFIX);
  if (!isMeCommand && !isListCommand && !isSetCommand && !isLokerCommand) return;

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
      `Applied: ${overview.applied}`,
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

  if (isListCommand) {
    const arg = lowerText.slice(LIST_COMMAND.length).trim();
    let take: number | undefined = LIST_DEFAULT_COUNT;
    if (arg === "all") {
      take = undefined;
    } else if (arg) {
      take = Number(arg);
      if (!Number.isInteger(take) || take < 1) {
        await reply(`Send "${LIST_COMMAND}", "${LIST_COMMAND} 20" or "${LIST_COMMAND} all".`);
        return;
      }
    }

    const { total, applications } = await JobApplicationService.listForMember(group.id, account.id, take);
    if (total === 0) {
      await reply(`No loker on "${group.name}" yet — add one with "${TRIGGER_PREFIX}".`);
      return;
    }

    // Same "applied" convention as /me and the web app — any status other than WISHLIST.
    const lines = applications.flatMap((app) => {
      const myStatus = app.memberStatuses[0]?.status ?? ApplicationStatus.WISHLIST;
      const title = `#${app.number} ${app.company} - ${app.position}`;
      if (myStatus !== ApplicationStatus.WISHLIST) return [`${title} ✅ ${myStatus}`];
      return [title, `   ${app.jobUrl ?? "(no link)"}`];
    });

    const header = `📋 Loker in "${group.name}" (${applications.length} of ${total}, ✅ = applied)
Change status: "${SET_COMMAND} <#> applied"`;
    const footer =
      applications.length < total
        ? `\nSend "${LIST_COMMAND} ${Math.min(total, applications.length + LIST_DEFAULT_COUNT)}" or "${LIST_COMMAND} all" for more.`
        : undefined;

    await reply([header, ...lines, footer].filter(Boolean).join("\n"));
    return;
  }

  if (isSetCommand) {
    const usage = `Send "${SET_COMMAND} <#> <status>", e.g. "${SET_COMMAND} 12 applied" (# from "${LIST_COMMAND}").
Statuses: wishlist, applied/lamar, oa, interview/wawancara, offer, rejected/ditolak, ghosted, withdrawn, notinterested`;
    const [numberArg, ...statusWords] = lowerText.slice(SET_COMMAND.length).trim().split(/\s+/);
    const number = Number(numberArg?.replace(/^#/, ""));
    const status = STATUS_ALIASES[statusWords.join("").replace(/[-_]/g, "")];
    if (!Number.isInteger(number) || number < 1 || !status) {
      await reply(usage);
      return;
    }

    const application = await JobApplicationService.getByNumberForMember(group.id, number, account.id);
    if (!application) {
      await reply(`There's no loker #${number} on "${group.name}" — check "${LIST_COMMAND}".`);
      return;
    }

    // Same as the web app's status dropdown (ApplicationDetailSheet): moving off
    // WISHLIST stamps today as the applied date, unless the member already has one.
    const hasAppliedAt = Boolean(application.memberStatuses[0]?.appliedAt);
    await JobApplicationService.upsertMemberStatus(application.id, account.id, {
      status,
      ...(status !== ApplicationStatus.WISHLIST && !hasAppliedAt ? { appliedAt: new Date() } : {}),
    });

    await reply(`#${number} ${application.company} - ${application.position} → ${status} ✅`);
    return;
  }

  const dumpText = text.slice(TRIGGER_PREFIX.length).trim();
  if (!dumpText) {
    await reply(`Send "${TRIGGER_PREFIX}" followed by the job posting/email/notes to add it.`);
    return;
  }

  const isUrlDump = LONE_URL_PATTERN.test(dumpText);

  let textToParse = dumpText;
  if (isUrlDump) {
    try {
      textToParse = await fetchPageText(dumpText);
    } catch (err) {
      await reply(err instanceof Error ? err.message : "Couldn't fetch that page.");
      return;
    }
    if (!textToParse.trim()) {
      await reply("That page had no readable text to extract from — try pasting the details as text instead.");
      return;
    }
  }

  let extracted;
  try {
    extracted = await parseJobDump(textToParse);
  } catch {
    await reply(
      isUrlDump
        ? "Couldn't parse that page — some sites (e.g. LinkedIn) block scraping. Try pasting the details as text instead."
        : "Couldn't parse that into a job application — try including more details (company, role, etc).",
    );
    return;
  }

  const created = await JobApplicationService.create({
    groupId: group.id,
    createdById: account.id,
    company: extracted.company,
    position: extracted.position,
    location: extracted.location,
    jobUrl: extracted.jobUrl ?? (isUrlDump ? dumpText : null),
    salary: extracted.salary,
    sourcePlatform: extracted.sourcePlatform,
    status: extracted.status,
    appliedAt: extracted.appliedAt ? new Date(extracted.appliedAt) : null,
    notes: extracted.notes,
    source: isUrlDump ? ApplicationSource.URL_DUMP : ApplicationSource.AI_DUMP,
    rawDumpText: dumpText,
  });

  const lines = [
    `Added to "${group.name}" as #${created.number} ✅`,
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
