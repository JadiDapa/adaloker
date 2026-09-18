import { notFound, redirect } from "next/navigation";
import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";

export default async function GroupLayout({
  children,
  params,
}: LayoutProps<"/groups/[groupId]">) {
  const { groupId } = await params;
  const account = await requireAccount();

  const group = await GroupService.getById(groupId);
  if (!group) notFound();

  const membership = await GroupService.getMembership(groupId, account.id);
  if (!membership) redirect("/groups");

  return children;
}
