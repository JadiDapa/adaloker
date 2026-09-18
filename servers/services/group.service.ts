import prisma from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";
import { GroupRole } from "@/generated/prisma";

export const GroupService = {
  /** Groups the account belongs to, with member count. */
  async listForAccount(accountId: string) {
    const memberships = await prisma.groupMember.findMany({
      where: { accountId },
      include: {
        group: {
          include: { _count: { select: { members: true, applications: true } } },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({ ...m.group, role: m.role }));
  },

  async getById(id: string) {
    return prisma.group.findUnique({ where: { id } });
  },

  async getMembership(groupId: string, accountId: string) {
    return prisma.groupMember.findUnique({
      where: { groupId_accountId: { groupId, accountId } },
    });
  },

  async listMembers(groupId: string) {
    return prisma.groupMember.findMany({
      where: { groupId },
      include: { account: true },
      orderBy: { joinedAt: "asc" },
    });
  },

  /** Creates a group and makes the creator its OWNER. Retries on the rare invite-code collision. */
  async create(name: string, ownerAccountId: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.group.create({
          data: {
            name,
            inviteCode: generateInviteCode(),
            members: {
              create: { accountId: ownerAccountId, role: GroupRole.OWNER },
            },
          },
        });
      } catch (error) {
        const isUniqueViolation =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";
        if (!isUniqueViolation || attempt === 4) throw error;
      }
    }
    throw new Error("Failed to generate a unique invite code");
  },

  async findByInviteCode(inviteCode: string) {
    return prisma.group.findUnique({ where: { inviteCode } });
  },

  /** Used by the WhatsApp bot to map an incoming group message to an app Group. */
  async findByWhatsappJid(whatsappGroupJid: string) {
    return prisma.group.findUnique({ where: { whatsappGroupJid } });
  },

  async setWhatsappGroupJid(groupId: string, whatsappGroupJid: string | null) {
    return prisma.group.update({ where: { id: groupId }, data: { whatsappGroupJid } });
  },

  async addMember(groupId: string, accountId: string) {
    return prisma.groupMember.upsert({
      where: { groupId_accountId: { groupId, accountId } },
      update: {},
      create: { groupId, accountId, role: GroupRole.MEMBER },
    });
  },

  async regenerateInviteCode(groupId: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.group.update({
          where: { id: groupId },
          data: { inviteCode: generateInviteCode() },
        });
      } catch (error) {
        const isUniqueViolation =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";
        if (!isUniqueViolation || attempt === 4) throw error;
      }
    }
    throw new Error("Failed to generate a unique invite code");
  },

  async rename(groupId: string, name: string) {
    return prisma.group.update({ where: { id: groupId }, data: { name } });
  },
};
