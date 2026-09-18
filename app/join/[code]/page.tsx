import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";

export default async function JoinByCodePage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/join/${code}`)}`);
  }

  const account = await requireAccount();
  const group = await GroupService.findByInviteCode(code.toUpperCase());

  if (!group) redirect("/groups");

  await GroupService.addMember(group.id, account.id);

  redirect(`/groups/${group.id}`);
}
