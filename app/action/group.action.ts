"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";
import {
  CreateGroupSchema,
  JoinGroupSchema,
  type CreateGroupDTO,
  type JoinGroupDTO,
} from "@/servers/validators/group.validator";
import { GroupRole } from "@/generated/prisma";
import type { ActionResult } from "./job-application.action";

export async function createGroup(input: CreateGroupDTO): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = CreateGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const group = await GroupService.create(parsed.data.name, account.id);

  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function joinGroup(input: JoinGroupDTO): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = JoinGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const group = await GroupService.findByInviteCode(parsed.data.inviteCode);
  if (!group) {
    return { ok: false, error: "No group found with that invite code" };
  }

  await GroupService.addMember(group.id, account.id);

  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function regenerateInviteCode(groupId: string): Promise<ActionResult> {
  const account = await requireAccount();
  const membership = await GroupService.getMembership(groupId, account.id);

  if (!membership || membership.role !== GroupRole.OWNER) {
    return { ok: false, error: "Only the group owner can regenerate the invite code" };
  }

  await GroupService.regenerateInviteCode(groupId);

  revalidatePath(`/groups/${groupId}/settings`);

  return { ok: true, message: "Invite code regenerated" };
}

export async function renameGroup(groupId: string, name: string): Promise<ActionResult> {
  const account = await requireAccount();
  const membership = await GroupService.getMembership(groupId, account.id);

  if (!membership || membership.role !== GroupRole.OWNER) {
    return { ok: false, error: "Only the group owner can rename the group" };
  }

  const parsed = CreateGroupSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  await GroupService.rename(groupId, parsed.data.name);

  revalidatePath(`/groups/${groupId}/settings`);

  return { ok: true, message: "Group renamed" };
}

/** Links this group to a WhatsApp group so the WhatsApp bot (see whatsapp-bot/)
 * knows which group's board to add "/loker" dumps to. Send "/id" in the WA
 * group chat to get its JID. */
export async function setGroupWhatsappJid(groupId: string, whatsappGroupJid: string): Promise<ActionResult> {
  const account = await requireAccount();
  const membership = await GroupService.getMembership(groupId, account.id);

  if (!membership || membership.role !== GroupRole.OWNER) {
    return { ok: false, error: "Only the group owner can link the WhatsApp group" };
  }

  const trimmed = whatsappGroupJid.trim();
  if (trimmed && !trimmed.endsWith("@g.us")) {
    return { ok: false, error: "That doesn't look like a WhatsApp group JID (should end with @g.us)" };
  }

  try {
    await GroupService.setWhatsappGroupJid(groupId, trimmed || null);
  } catch (error) {
    const isUniqueViolation =
      typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    if (isUniqueViolation) {
      return { ok: false, error: "That WhatsApp group is already linked to another group" };
    }
    throw error;
  }

  revalidatePath(`/groups/${groupId}/settings`);

  return { ok: true, message: "WhatsApp group linked" };
}
