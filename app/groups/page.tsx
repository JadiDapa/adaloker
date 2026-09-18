import Link from "next/link";
import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";
import { AppShell } from "@/components/shared/AppShell";
import { GroupDialogs } from "@/components/groups/GroupDialogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default async function GroupsPage() {
  const account = await requireAccount();
  const groups = await GroupService.listForAccount(account.id);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your groups</h1>
          <p className="text-muted-foreground text-sm">
            Each group is a shared job-application board — everyone in it sees the same list.
          </p>
        </div>
        <GroupDialogs />
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            You&apos;re not in any group yet. Create one or join with an invite code to get
            started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:shadow-[var(--shadow-raised-lg)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{group.name}</CardTitle>
                    {group.role === "OWNER" && <Badge variant="secondary">Owner</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="size-4" />
                    {group._count.members} member{group._count.members === 1 ? "" : "s"}
                  </span>
                  <span>
                    {group._count.applications} application
                    {group._count.applications === 1 ? "" : "s"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
