import { z } from "zod";
import { ApplicationStatus } from "@/generated/prisma";

export const ApplicationStatusValues = Object.values(ApplicationStatus) as [
  ApplicationStatus,
  ...ApplicationStatus[],
];

export const JobApplicationFormSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  position: z.string().trim().min(1, "Position is required").max(200),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  jobUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  salary: z.string().trim().max(200).optional().or(z.literal("")),
  /** Free text (e.g. "LinkedIn", "Glints") — not an enum, so new platforms need no migration. */
  sourcePlatform: z.string().trim().max(100).optional().or(z.literal("")),
  /** The creator's own status/date for this job — everyone else starts at WISHLIST. */
  status: z.enum(ApplicationStatusValues),
  appliedAt: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(20000).optional().or(z.literal("")),
});

export type JobApplicationFormDTO = z.infer<typeof JobApplicationFormSchema>;

export const AiDumpSchema = z.object({
  text: z.string().trim().min(1, "Paste something to parse").max(20000),
});

export type AiDumpDTO = z.infer<typeof AiDumpSchema>;

export const UrlDumpSchema = z.object({
  url: z.string().trim().min(1, "Paste a job URL").url("That doesn't look like a valid URL").max(2000),
});

export type UrlDumpDTO = z.infer<typeof UrlDumpSchema>;

/** Updates the current member's own status/applied-date for a job application. */
export const UpdateMyApplicationStatusSchema = z.object({
  status: z.enum(ApplicationStatusValues).optional(),
  appliedAt: z.string().trim().optional().or(z.literal("")),
});

/** Updates the shared fields of a job application — visible/editable by every member. */
export const UpdateJobApplicationFieldsSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200).optional(),
  position: z.string().trim().min(1, "Position is required").max(200).optional(),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  jobUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  salary: z.string().trim().max(200).optional().or(z.literal("")),
  sourcePlatform: z.string().trim().max(100).optional().or(z.literal("")),
});

export type UpdateJobApplicationFieldsDTO = z.infer<typeof UpdateJobApplicationFieldsSchema>;
