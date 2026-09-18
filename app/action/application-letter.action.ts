"use server";

import { revalidatePath } from "next/cache";
import { UTFile } from "uploadthing/server";
import { requireAccount } from "@/lib/clerk-session";
import { ApplicationLetterService } from "@/servers/services/application-letter.service";
import { renderLetterTemplate } from "@/lib/application-letter-template";
import { renderApplicationLetterPdf } from "@/lib/pdf/application-letter-pdf";
import { utapi } from "@/lib/uploadthing";
import {
  LetterTemplateSchema,
  GenerateLetterSchema,
  type GenerateLetterDTO,
} from "@/servers/validators/application-letter.validator";
import type { ActionResult } from "./job-application.action";

export async function saveLetterTemplate(template: string): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = LetterTemplateSchema.safeParse({ template });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid template" };
  }

  await ApplicationLetterService.saveTemplate(account.id, parsed.data.template);

  revalidatePath("/profile");

  return { ok: true, message: "Letter template saved" };
}

/** Deletes every expired letter (DB row + PDF file) for the current account. Called
 * on every list/generate so stale letters disappear even if the cleanup script (see
 * scripts/cleanup-expired-application-letters.ts) hasn't run yet. */
async function purgeExpiredLetters(accountId: string) {
  const expired = await ApplicationLetterService.listExpired(accountId);
  if (expired.length === 0) return;

  await Promise.all(expired.map((letter) => utapi.deleteFiles(letter.pdfKey).catch(() => {})));
  await ApplicationLetterService.deleteMany(expired.map((letter) => letter.id));
}

export async function listApplicationLetters() {
  const account = await requireAccount();

  await purgeExpiredLetters(account.id);

  return ApplicationLetterService.listActive(account.id);
}

export async function generateApplicationLetter(
  input: GenerateLetterDTO,
): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = GenerateLetterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const template = await ApplicationLetterService.getTemplate(account.id);
  if (!template) {
    return { ok: false, error: "Save your letter template first" };
  }

  await purgeExpiredLetters(account.id);

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Invalid date" };
  }

  const content = renderLetterTemplate(template, {
    date,
    companyName: parsed.data.companyName,
    position: parsed.data.position,
  });

  const pdfBuffer = await renderApplicationLetterPdf(content);
  const fileName = `Application Letter - ${parsed.data.companyName} - ${parsed.data.position}.pdf`;
  const file = new UTFile([new Uint8Array(pdfBuffer)], fileName, { type: "application/pdf" });

  const [uploaded] = await utapi.uploadFiles([file]);
  if (uploaded.error || !uploaded.data) {
    return { ok: false, error: "Could not upload the generated PDF" };
  }

  await ApplicationLetterService.create(account.id, {
    date,
    companyName: parsed.data.companyName,
    position: parsed.data.position,
    content,
    pdfUrl: uploaded.data.ufsUrl,
    pdfKey: uploaded.data.key,
    pdfName: fileName,
  });

  revalidatePath("/profile");

  return { ok: true, message: "Application letter generated" };
}

export async function deleteApplicationLetter(letterId: string): Promise<ActionResult> {
  const account = await requireAccount();

  const letter = await ApplicationLetterService.delete(account.id, letterId);
  if (!letter) {
    return { ok: false, error: "Letter not found" };
  }

  await utapi.deleteFiles(letter.pdfKey).catch(() => {});

  revalidatePath("/profile");

  return { ok: true, message: "Letter deleted" };
}
