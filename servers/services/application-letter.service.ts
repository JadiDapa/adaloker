import prisma from "@/lib/prisma";

/** How long a generated letter (DB row + PDF file) is kept before it's purged. */
export const LETTER_RETENTION_DAYS = 7;

export function letterExpiresAt(from: Date = new Date()) {
  return new Date(from.getTime() + LETTER_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export const ApplicationLetterService = {
  async getTemplate(accountId: string) {
    const profile = await prisma.personalProfile.findUnique({
      where: { accountId },
      select: { letterTemplate: true },
    });
    return profile?.letterTemplate ?? null;
  },

  async saveTemplate(accountId: string, template: string) {
    return prisma.personalProfile.upsert({
      where: { accountId },
      update: { letterTemplate: template },
      create: { accountId, letterTemplate: template },
    });
  },

  async create(
    accountId: string,
    data: {
      date: Date;
      companyName: string;
      position: string;
      content: string;
      pdfUrl: string;
      pdfKey: string;
      pdfName: string;
    },
  ) {
    const profile = await prisma.personalProfile.upsert({
      where: { accountId },
      update: {},
      create: { accountId },
    });

    return prisma.applicationLetter.create({
      data: { profileId: profile.id, ...data, expiresAt: letterExpiresAt() },
    });
  },

  /** Live (non-expired) letters for this account, newest first. Does not delete
   * expired ones itself -- callers purge those first (see the action layer's
   * `purgeExpiredLetters`, which also needs to delete the UploadThing files). */
  async listActive(accountId: string) {
    const profile = await prisma.personalProfile.findUnique({ where: { accountId } });
    if (!profile) return [];

    return prisma.applicationLetter.findMany({
      where: { profileId: profile.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Expired letters for this account -- fetched so the caller can delete their
   * UploadThing files before removing the DB rows. */
  async listExpired(accountId: string) {
    const profile = await prisma.personalProfile.findUnique({ where: { accountId } });
    if (!profile) return [];

    return prisma.applicationLetter.findMany({
      where: { profileId: profile.id, expiresAt: { lte: new Date() } },
    });
  },

  /** All expired letters across every account -- for the standalone cleanup script. */
  async listAllExpired() {
    return prisma.applicationLetter.findMany({ where: { expiresAt: { lte: new Date() } } });
  },

  async deleteMany(ids: string[]) {
    if (ids.length === 0) return;
    await prisma.applicationLetter.deleteMany({ where: { id: { in: ids } } });
  },

  /** Only deletes the letter if it actually belongs to this account. */
  async delete(accountId: string, letterId: string) {
    const letter = await prisma.applicationLetter.findUnique({
      where: { id: letterId },
      include: { profile: true },
    });
    if (!letter || letter.profile.accountId !== accountId) return null;

    await prisma.applicationLetter.delete({ where: { id: letterId } });
    return letter;
  },
};
