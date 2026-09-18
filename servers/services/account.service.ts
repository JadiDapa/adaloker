import prisma from "@/lib/prisma";

export const AccountService = {
  async getByClerkId(clerkId: string) {
    return prisma.account.findUnique({ where: { clerkId } });
  },

  async getById(id: string) {
    return prisma.account.findUnique({ where: { id } });
  },

  /** Used by the WhatsApp bot to match a message's sender JID to an Account. */
  async findByWhatsappPhone(whatsappPhone: string) {
    return prisma.account.findUnique({ where: { whatsappPhone } });
  },

  async setWhatsappPhone(accountId: string, whatsappPhone: string | null) {
    return prisma.account.update({ where: { id: accountId }, data: { whatsappPhone } });
  },

  /**
   * Sync from Clerk webhook (`user.created`/`user.updated`). Called on every
   * update event too so name/email/avatar edits in Clerk propagate here.
   */
  async upsertFromClerk(data: {
    clerkId: string;
    name: string;
    email: string | null;
    imageUrl: string | null;
  }) {
    return prisma.account.upsert({
      where: { clerkId: data.clerkId },
      update: { name: data.name, email: data.email, imageUrl: data.imageUrl },
      create: data,
    });
  },
};
