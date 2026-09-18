import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export type PersonalProfileData = {
  personalData: Prisma.InputJsonValue;
  contactInfo: Prisma.InputJsonValue;
  educations: Prisma.InputJsonValue;
  workExperience: Prisma.InputJsonValue;
  organizations: Prisma.InputJsonValue;
  skills: Prisma.InputJsonValue;
  languages: Prisma.InputJsonValue;
  rawDumpText?: string | null;
};

const EMPTY_SECTIONS: PersonalProfileData = {
  personalData: [],
  contactInfo: [],
  educations: [],
  workExperience: [],
  organizations: [],
  skills: [],
  languages: [],
};

export const PersonalProfileService = {
  async getByAccountId(accountId: string) {
    return prisma.personalProfile.findUnique({
      where: { accountId },
      include: { documents: { orderBy: { createdAt: "asc" } } },
    });
  },

  async upsert(accountId: string, data: PersonalProfileData) {
    return prisma.personalProfile.upsert({
      where: { accountId },
      update: data,
      create: { accountId, ...data },
    });
  },

  /** Partial upsert for just the resume fields — doesn't require the rest of the profile to exist yet. */
  async setResume(
    accountId: string,
    resume: { resumeUrl: string; resumeName: string; resumeKey: string },
  ) {
    return prisma.personalProfile.upsert({
      where: { accountId },
      update: resume,
      create: { accountId, ...EMPTY_SECTIONS, ...resume },
    });
  },

  async clearResume(accountId: string) {
    return prisma.personalProfile.update({
      where: { accountId },
      data: { resumeUrl: null, resumeName: null, resumeKey: null },
    });
  },

  /** Ensures a profile row exists, then attaches a new document to it. */
  async addDocument(
    accountId: string,
    doc: { label: string; url: string; key: string; name: string },
  ) {
    const profile = await prisma.personalProfile.upsert({
      where: { accountId },
      update: {},
      create: { accountId, ...EMPTY_SECTIONS },
    });

    return prisma.profileDocument.create({ data: { profileId: profile.id, ...doc } });
  },

  /** Only removes the document if it actually belongs to this account's profile. */
  async removeDocument(accountId: string, documentId: string) {
    const doc = await prisma.profileDocument.findUnique({
      where: { id: documentId },
      include: { profile: true },
    });
    if (!doc || doc.profile.accountId !== accountId) return null;

    await prisma.profileDocument.delete({ where: { id: documentId } });
    return doc;
  },
};
