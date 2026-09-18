import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { AccountService } from "@/servers/services/account.service";
import type { Account } from "@/generated/prisma";

/**
 * Fetches the Clerk user directly and upserts the local Account row. The
 * webhook (`app/api/webhooks/clerk/route.ts`) is the primary sync path, but
 * it needs a publicly reachable URL — it never fires against plain
 * `localhost` in dev — so without this fallback a brand-new sign-up has no
 * local Account row and `requireAccount()` would loop between `/` and
 * `/sign-in` forever (proxy.ts sees a valid session and bounces away from
 * `/sign-in`, this then finds no Account and bounces back to `/sign-in`).
 */
async function syncAccountFromClerk(clerkId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkId);

  const email = user.emailAddresses[0]?.emailAddress ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || email || "";

  return AccountService.upsertFromClerk({
    clerkId,
    name,
    email,
    imageUrl: user.imageUrl ?? null,
  });
}

/** Data access layer for the current user's local `Account` row. */
export const getCurrentAccount = cache(async (): Promise<Account | null> => {
  const { userId } = await auth();

  if (!userId) return null;

  const account = await AccountService.getByClerkId(userId);

  return account ?? syncAccountFromClerk(userId);
});

/** Requires a signed-in Clerk session with a synced Account row. */
export async function requireAccount(): Promise<Account> {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const account = await getCurrentAccount();

  if (!account) redirect("/sign-in");

  return account;
}
