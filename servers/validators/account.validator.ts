import { z } from "zod";

/** E.164: leading "+", country code, no spaces/dashes — matches how the WhatsApp
 * bot normalizes a sender's JID (see whatsapp-bot/index.ts:normalizePhone). */
export const WhatsappPhoneSchema = z.object({
  whatsappPhone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +6281234567890")
    .or(z.literal("")),
});

export type WhatsappPhoneDTO = z.infer<typeof WhatsappPhoneSchema>;
