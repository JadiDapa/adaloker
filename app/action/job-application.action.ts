"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";
import { JobApplicationService } from "@/servers/services/job-application.service";
import { parseJobDump } from "@/lib/ai/parse-job-dump";
import {
  AiDumpSchema,
  JobApplicationFormSchema,
  UpdateMyApplicationStatusSchema,
  UpdateJobApplicationFieldsSchema,
  type JobApplicationFormDTO,
  type UpdateJobApplicationFieldsDTO,
} from "@/servers/validators/job-application.validator";
import { ApplicationSource } from "@/generated/prisma";
import type { ExtractedJobApplication } from "@/lib/ai/parse-job-dump";
import { utapi } from "@/lib/uploadthing";

export type ActionResult<T = void> =
  | ({ ok: true; message: string } & (T extends void ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

async function requireMembership(groupId: string) {
  const account = await requireAccount();
  const membership = await GroupService.getMembership(groupId, account.id);

  if (!membership) throw new Error("You are not a member of this group");

  return account;
}

function toDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createJobApplication(
  groupId: string,
  input: JobApplicationFormDTO,
): Promise<ActionResult> {
  const account = await requireMembership(groupId);

  const parsed = JobApplicationFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await JobApplicationService.create({
    groupId,
    createdById: account.id,
    company: parsed.data.company,
    position: parsed.data.position,
    location: parsed.data.location || null,
    jobUrl: parsed.data.jobUrl || null,
    salary: parsed.data.salary || null,
    status: parsed.data.status,
    appliedAt: toDate(parsed.data.appliedAt),
    notes: parsed.data.notes || null,
    source: ApplicationSource.MANUAL,
  });

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Application added" };
}

/** Parses free-form pasted text into structured fields via Claude — does not save anything yet. */
export async function parseJobApplicationDump(
  groupId: string,
  text: string,
): Promise<ActionResult<ExtractedJobApplication>> {
  await requireMembership(groupId);

  const parsed = AiDumpSchema.safeParse({ text });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const extracted = await parseJobDump(parsed.data.text);
    return { ok: true, message: "Parsed", data: extracted };
  } catch {
    return { ok: false, error: "Could not parse that text. Try pasting more context, or fill the form manually." };
  }
}

export async function createJobApplicationFromDump(
  groupId: string,
  extracted: JobApplicationFormDTO,
  rawDumpText: string,
): Promise<ActionResult> {
  const account = await requireMembership(groupId);

  const parsed = JobApplicationFormSchema.safeParse(extracted);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await JobApplicationService.create({
    groupId,
    createdById: account.id,
    company: parsed.data.company,
    position: parsed.data.position,
    location: parsed.data.location || null,
    jobUrl: parsed.data.jobUrl || null,
    salary: parsed.data.salary || null,
    status: parsed.data.status,
    appliedAt: toDate(parsed.data.appliedAt),
    notes: parsed.data.notes || null,
    source: ApplicationSource.AI_DUMP,
    rawDumpText,
  });

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Application added" };
}

/** Updates the current user's own status/applied-date for a job application. */
export async function updateMyApplicationStatus(
  groupId: string,
  applicationId: string,
  input: { status?: string; appliedAt?: string },
): Promise<ActionResult> {
  const account = await requireMembership(groupId);

  const parsed = UpdateMyApplicationStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status" };
  }

  await JobApplicationService.upsertMemberStatus(applicationId, account.id, {
    status: parsed.data.status,
    appliedAt:
      parsed.data.appliedAt !== undefined ? toDate(parsed.data.appliedAt) : undefined,
  });

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Status updated" };
}

/** Updates one or more shared fields (company/position/location/jobUrl/salary) — any
 * member can edit, since createdBy is attribution only, not an access filter. */
export async function updateJobApplicationFields(
  groupId: string,
  applicationId: string,
  input: UpdateJobApplicationFieldsDTO,
): Promise<ActionResult> {
  await requireMembership(groupId);

  const parsed = UpdateJobApplicationFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { company, position, location, jobUrl, salary } = parsed.data;
  await JobApplicationService.update(applicationId, {
    ...(company !== undefined ? { company } : {}),
    ...(position !== undefined ? { position } : {}),
    ...(location !== undefined ? { location: location || null } : {}),
    ...(jobUrl !== undefined ? { jobUrl: jobUrl || null } : {}),
    ...(salary !== undefined ? { salary: salary || null } : {}),
  });

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Application updated" };
}

export async function deleteJobApplication(
  groupId: string,
  applicationId: string,
): Promise<ActionResult> {
  await requireMembership(groupId);

  await JobApplicationService.delete(applicationId);

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Application deleted" };
}

/** Called after the client-side UploadThing upload finishes — just records the result. */
export async function attachApplicationFile(
  groupId: string,
  applicationId: string,
  file: { url: string; key: string; name: string },
): Promise<ActionResult> {
  await requireMembership(groupId);

  await JobApplicationService.addAttachment(applicationId, file);

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Attachment added" };
}

export async function deleteApplicationAttachment(
  groupId: string,
  attachmentId: string,
): Promise<ActionResult> {
  await requireMembership(groupId);

  const attachment = await JobApplicationService.getAttachment(attachmentId);
  if (attachment) {
    await utapi.deleteFiles(attachment.key).catch(() => {});
    await JobApplicationService.deleteAttachment(attachmentId);
  }

  revalidatePath(`/groups/${groupId}`);

  return { ok: true, message: "Attachment removed" };
}
