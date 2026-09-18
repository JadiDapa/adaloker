import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { AccountService } from "@/servers/services/account.service";
import { GroupService } from "@/servers/services/group.service";

const f = createUploadthing();

async function requireAccountId() {
  const { userId } = await auth();
  if (!userId) throw new UploadThingError("Unauthorized");

  const account = await AccountService.getByClerkId(userId);
  if (!account) throw new UploadThingError("Unauthorized");

  return account.id;
}

export const uploadRouter = {
  /** Resume/CV PDF on the private Personal Data Hold profile. */
  resumeUploader: f({ pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const accountId = await requireAccountId();
      return { accountId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { accountId: metadata.accountId, url: file.ufsUrl, key: file.key, name: file.name };
    }),

  /** Arbitrary labeled documents (KTP, ijazah, transkrip nilai, photo, etc.) on the
   * private Personal Data Hold profile -- label/type isn't restricted here, the user
   * picks it client-side (see components/profile/DocumentsCard.tsx). */
  profileDocumentUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const accountId = await requireAccountId();
      return { accountId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { accountId: metadata.accountId, url: file.ufsUrl, key: file.key, name: file.name };
    }),

  /** Attachments (offer letters, screenshots, etc.) on a shared-board job application. */
  applicationAttachmentUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    image: { maxFileSize: "8MB", maxFileCount: 5 },
  })
    .input(z.object({ groupId: z.string(), applicationId: z.string() }))
    .middleware(async ({ input }) => {
      const accountId = await requireAccountId();

      const membership = await GroupService.getMembership(input.groupId, accountId);
      if (!membership) throw new UploadThingError("Not a member of this group");

      return { accountId, applicationId: input.applicationId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        applicationId: metadata.applicationId,
        url: file.ufsUrl,
        key: file.key,
        name: file.name,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
