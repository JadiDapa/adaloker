import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { AccountService } from "@/servers/services/account.service";

/**
 * Syncs Clerk identity -> local `Account` table (Prisma relations need a
 * queryable FK, not a lookup against Clerk's own store). Verified with
 * `CLERK_WEBHOOK_SIGNING_SECRET` (svix) via Clerk's own helper.
 *
 * `user.deleted` is intentionally not handled — deleting the local Account
 * row would either cascade-delete their group memberships and orphan shared
 * job applications, or hit the FK restrict on `JobApplication.createdBy`.
 * Leaving the row in place keeps shared-board history intact even after
 * someone deletes their Clerk account.
 */
export async function POST(req: NextRequest) {
  const event = await verifyWebhook(req);

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = event.data;

    const email = email_addresses[0]?.email_address ?? null;
    const name = [first_name, last_name].filter(Boolean).join(" ") || email || "";

    await AccountService.upsertFromClerk({
      clerkId: id,
      name,
      email,
      imageUrl: image_url ?? null,
    });
  }

  return new Response("ok", { status: 200 });
}
