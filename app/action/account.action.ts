"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/clerk-session";
import { AccountService } from "@/servers/services/account.service";
import { WhatsappPhoneSchema } from "@/servers/validators/account.validator";
import type { ActionResult } from "./job-application.action";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Links the current account to a WhatsApp number so the WhatsApp bot (see
 * whatsapp-bot/) can attribute messages from that number to this account. */
export async function updateMyWhatsappPhone(input: { whatsappPhone: string }): Promise<ActionResult> {
  const account = await requireAccount();

  const parsed = WhatsappPhoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid phone number" };
  }

  try {
    await AccountService.setWhatsappPhone(account.id, parsed.data.whatsappPhone || null);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "That number is already linked to another account" };
    }
    throw error;
  }

  revalidatePath("/profile");

  return { ok: true, message: "WhatsApp number saved" };
}
