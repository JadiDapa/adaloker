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
  sourcePlatform?: string | null;
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

  /** Assigns the next per-group `number` (max + 1). Two members adding at the same
   * moment can race to the same number — the `@@unique([groupId, number])` constraint
   * rejects the loser, which just retries with a fresh max. */
  async create(data: JobApplicationCreateData) {
    const { status, appliedAt, createdById, ...rest } = data;

    for (let attempt = 1; ; attempt++) {
      const { _max } = await prisma.jobApplication.aggregate({
        where: { groupId: data.groupId },
        _max: { number: true },
      });

      try {
        return await prisma.jobApplication.create({
          data: {
            ...rest,
            number: (_max.number ?? 0) + 1,
            createdById,
            memberStatuses: {
              create: { accountId: createdById, status, appliedAt: appliedAt ?? null },
            },
          },
        });
      } catch (error) {
        const isNumberClash =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!isNumberClash || attempt >= 5) throw error;
      }
    }
  },

  /** Looks up an application by its per-group `number` (as shown by the bot's "/list"),
   * with only the given member's own status row attached. */
  async getByNumberForMember(groupId: string, number: number, accountId: string) {
    return prisma.jobApplication.findUnique({
      where: { groupId_number: { groupId, number } },
      select: {
        id: true,
        company: true,
        position: true,
        memberStatuses: { where: { accountId }, select: { status: true, appliedAt: true } },
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

  /** Summary for the WhatsApp bot's "/me" command — one member's view of one group's
   * shared board. A member with no `ApplicationMemberStatus` row for an application is
   * WISHLIST by convention (see the model comment), so wishlisted = total - (rows with
   * a non-WISHLIST status). "Nearest wawancara" reuses `appliedAt` as the date attached
   * to whatever the member's current status is (see ApplicationDetailSheet — it's not
   * strictly an "applied" date, the UI lets you set it for any status including
   * INTERVIEW), filtered to today-or-later and closest first. */
  async getMemberOverview(groupId: string, accountId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, nonWishlistCount, latest, nearestInterview] = await Promise.all([
      prisma.jobApplication.count({ where: { groupId } }),
      prisma.applicationMemberStatus.count({
        where: { accountId, status: { not: ApplicationStatus.WISHLIST }, application: { groupId } },
      }),
      prisma.jobApplication.findFirst({
        where: { groupId },
        orderBy: { createdAt: "desc" },
        select: { company: true, position: true, createdAt: true },
      }),
      prisma.applicationMemberStatus.findFirst({
        where: {
          accountId,
          status: ApplicationStatus.INTERVIEW,
          appliedAt: { gte: startOfToday },
          application: { groupId },
        },
        orderBy: { appliedAt: "asc" },
        select: { appliedAt: true, application: { select: { company: true, position: true } } },
      }),
    ]);

    return {
      total,
      /** Same convention as the web app's "Applied" filter — any status other than WISHLIST. */
      applied: nonWishlistCount,
      wishlisted: total - nonWishlistCount,
      latest,
      nearestInterview,
    };
  },

  /** Newest-first board entries for the WhatsApp bot's "/list" command, with only the
   * given member's own status row attached (no row = WISHLIST by convention). Omit
   * `take` to list the whole board. */
  async listForMember(groupId: string, accountId: string, take?: number) {
    const [total, applications] = await Promise.all([
      prisma.jobApplication.count({ where: { groupId } }),
      prisma.jobApplication.findMany({
        where: { groupId },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          number: true,
          company: true,
          position: true,
          jobUrl: true,
          memberStatuses: { where: { accountId }, select: { status: true } },
        },
      }),
    ]);

    return { total, applications };
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
