import { z } from "zod";

export const CreateGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100),
});

export type CreateGroupDTO = z.infer<typeof CreateGroupSchema>;

export const JoinGroupSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(1, "Invite code is required")
    .transform((v) => v.toUpperCase()),
});

export type JoinGroupDTO = z.infer<typeof JoinGroupSchema>;
