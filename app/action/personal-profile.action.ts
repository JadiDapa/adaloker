"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/clerk-session";
import { PersonalProfileService } from "@/servers/services/personal-profile.service";
import { parseProfileDump, mapExtractedProfileToForm } from "@/lib/ai/parse-profile-dump";
import { utapi } from "@/lib/uploadthing";
import {
  AddProfileDocumentSchema,
  AiProfileDumpSchema,
  PersonalProfileFormSchema,
  type PersonalProfileFormDTO,
} from "@/servers/validators/personal-profile.validator";
import type { ActionResult } from "./job-application.action";

export async function saveProfile(input: PersonalProfileFormDTO): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = PersonalProfileFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await PersonalProfileService.upsert(account.id, parsed.data);

  revalidatePath("/profile");

  return { ok: true, message: "Profile saved" };
}

/** Parses free-form pasted text (CV, bio, etc) into structured fields — does not save anything yet. */
export async function parseProfileDumpAction(
  text: string,
): Promise<ActionResult<PersonalProfileFormDTO>> {
  await requireAccount();

  const parsed = AiProfileDumpSchema.safeParse({ text });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const extracted = await parseProfileDump(parsed.data.text);
    return { ok: true, message: "Parsed", data: mapExtractedProfileToForm(extracted) };
  } catch {
    return { ok: false, error: "Could not parse that text. Try pasting more context, or fill the form manually." };
  }
}

export async function saveProfileFromDump(
  input: PersonalProfileFormDTO,
  rawDumpText: string,
): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = PersonalProfileFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await PersonalProfileService.upsert(account.id, { ...parsed.data, rawDumpText });

  revalidatePath("/profile");

  return { ok: true, message: "Profile saved" };
}

/** Called after the client-side UploadThing upload finishes — just records the result. */
export async function saveResume(file: {
  url: string;
  key: string;
  name: string;
}): Promise<ActionResult> {
  const account = await requireAccount();

  const existing = await PersonalProfileService.getByAccountId(account.id);

  await PersonalProfileService.setResume(account.id, {
    resumeUrl: file.url,
    resumeName: file.name,
    resumeKey: file.key,
  });

  // Best-effort cleanup of the old file — a failure here shouldn't block the new upload.
  if (existing?.resumeKey) {
    await utapi.deleteFiles(existing.resumeKey).catch(() => {});
  }

  revalidatePath("/profile");

  return { ok: true, message: "Resume uploaded" };
}

export async function removeResume(): Promise<ActionResult> {
  const account = await requireAccount();

  const existing = await PersonalProfileService.getByAccountId(account.id);
  if (existing?.resumeKey) {
    await utapi.deleteFiles(existing.resumeKey).catch(() => {});
  }

  await PersonalProfileService.clearResume(account.id);

  revalidatePath("/profile");

  return { ok: true, message: "Resume removed" };
}

/** Records an arbitrary uploaded document (KTP, ijazah, photo, etc) after the
 * client-side UploadThing upload finishes — the label is whatever the user typed. */
export async function addProfileDocument(input: {
  label: string;
  url: string;
  key: string;
  name: string;
}): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = AddProfileDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid document" };
  }

  await PersonalProfileService.addDocument(account.id, parsed.data);

  revalidatePath("/profile");

  return { ok: true, message: "Document uploaded" };
}

export async function removeProfileDocument(documentId: string): Promise<ActionResult> {
  const account = await requireAccount();

  const removed = await PersonalProfileService.removeDocument(account.id, documentId);
  if (!removed) {
    return { ok: false, error: "Document not found" };
  }

  await utapi.deleteFiles(removed.key).catch(() => {});

  revalidatePath("/profile");

  return { ok: true, message: "Document removed" };
}
