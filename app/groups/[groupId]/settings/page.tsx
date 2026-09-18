import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";
import { AppShell } from "@/components/shared/AppShell";
import { InviteCodeCard } from "@/components/groups/InviteCodeCard";
import { WhatsappGroupLinkCard } from "@/components/groups/WhatsappGroupLinkCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function GroupSettingsPage({
  params,
}: PageProps<"/groups/[groupId]/settings">) {
  const { groupId } = await params;
  const account = await requireAccount();

  const [group, members, membership] = await Promise.all([
    GroupService.getById(groupId),
    GroupService.listMembers(groupId),
    GroupService.getMembership(groupId, account.id),
  ]);

  if (!group || !membership) return null;

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold">{group.name} settings</h1>

      <div className="space-y-6">
        <InviteCodeCard
          key={group.inviteCode}
          groupId={groupId}
          inviteCode={group.inviteCode}
          isOwner={membership.role === "OWNER"}
        />

        <WhatsappGroupLinkCard
          key={group.whatsappGroupJid}
          groupId={groupId}
          whatsappGroupJid={group.whatsappGroupJid}
          isOwner={membership.role === "OWNER"}
        />

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={m.account.imageUrl ?? undefined} />
                  <AvatarFallback>{m.account.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm">{m.account.name}</span>
                {m.role === "OWNER" && <Badge variant="secondary">Owner</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
