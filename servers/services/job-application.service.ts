import prisma from "@/lib/prisma";
import { ApplicationSource, ApplicationStatus, Prisma } from "@/generated/prisma";

export type JobApplicationCreateData = {
  groupId: string;
  createdById: string;
  company: string;
  position: string;
  location?: string | null;
  jobUrl?: string | null;
  salary?: string | null;
  /** Seeds the creator's own member-status row — other members start at WISHLIST. */
  status: ApplicationStatus;
  appliedAt?: Date | null;
  notes?: string | null;
  source: ApplicationSource;
  rawDumpText?: string | null;
};

const LIST_INCLUDE = {
  createdBy: { select: { id: true, name: true, imageUrl: true } },
  attachments: { orderBy: { createdAt: "asc" as const } },
  memberStatuses: { include: { account: { select: { id: true, name: true } } } },
};

export const JobApplicationService = {
  /** Shared board — every member of the group sees every application in it. */
  async listForGroup(groupId: string) {
    return prisma.jobApplication.findMany({
      where: { groupId },
      include: LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.jobApplication.findUnique({
      where: { id },
      include: LIST_INCLUDE,
    });
  },

  async create(data: JobApplicationCreateData) {
    const { status, appliedAt, createdById, ...rest } = data;

    return prisma.jobApplication.create({
      data: {
        ...rest,
        createdById,
        memberStatuses: {
          create: { accountId: createdById, status, appliedAt: appliedAt ?? null },
        },
      },
    });
  },

  async update(id: string, data: Prisma.JobApplicationUpdateInput) {
    return prisma.jobApplication.update({ where: { id }, data });
  },

  /** Upserts one member's own status/applied-date for a job application. */
  async upsertMemberStatus(
    applicationId: string,
    accountId: string,
    data: { status?: ApplicationStatus; appliedAt?: Date | null },
  ) {
    return prisma.applicationMemberStatus.upsert({
      where: { applicationId_accountId: { applicationId, accountId } },
      create: {
        applicationId,
        accountId,
        status: data.status ?? ApplicationStatus.WISHLIST,
        appliedAt: data.appliedAt ?? null,
      },
      update: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.appliedAt !== undefined ? { appliedAt: data.appliedAt } : {}),
      },
    });
  },

  async delete(id: string) {
    return prisma.jobApplication.delete({ where: { id } });
  },

  async addAttachment(
    applicationId: string,
    file: { url: string; key: string; name: string },
  ) {
    return prisma.jobApplicationAttachment.create({ data: { applicationId, ...file } });
  },

  async getAttachment(attachmentId: string) {
    return prisma.jobApplicationAttachment.findUnique({ where: { id: attachmentId } });
  },

  async deleteAttachment(attachmentId: string) {
    return prisma.jobApplicationAttachment.delete({ where: { id: attachmentId } });
  },
};
