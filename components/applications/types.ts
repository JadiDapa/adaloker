import type { ApplicationSource, ApplicationStatus } from "@/generated/prisma";

export type MemberStatus = {
  accountId: string;
  status: ApplicationStatus;
  appliedAt: Date | null;
  account: { id: string; name: string };
};

export type Attachment = { id: string; url: string; name: string };

export type Application = {
  id: string;
  company: string;
  position: string;
  location: string | null;
  jobUrl: string | null;
  salary: string | null;
  sourcePlatform: string | null;
  notes: string | null;
  source: ApplicationSource;
  createdBy: { id: string; name: string; imageUrl: string | null };
  attachments: Attachment[];
  memberStatuses: MemberStatus[];
};
