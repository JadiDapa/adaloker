import Link from "next/link";
import { requireAccount } from "@/lib/clerk-session";
import { GroupService } from "@/servers/services/group.service";
import { JobApplicationService } from "@/servers/services/job-application.service";
import { AppShell } from "@/components/shared/AppShell";
import { AddApplicationDialog } from "@/components/applications/AddApplicationDialog";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { ApplicationStats } from "@/components/applications/ApplicationStats";
import { SourcePlatformDatalist } from "@/components/applications/source-platforms";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default async function GroupBoardPage({ params }: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  const [account, group, applications] = await Promise.all([
    requireAccount(),
    GroupService.getById(groupId),
    JobApplicationService.listForGroup(groupId),
  ]);

  if (!group) return null;

  return (
    <AppShell contentClassName="max-w-[1440px]">
      <SourcePlatformDatalist />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-muted-foreground text-sm">
            Shared board — everything added here is visible to the whole group.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/groups/${groupId}/settings`}>
              <Settings className="size-4" />
            </Link>
          </Button>
          <AddApplicationDialog groupId={groupId} />
        </div>
      </div>

      <ApplicationStats
        viewerAccountId={account.id}
        applications={applications}
      />

      <ApplicationsTable
        groupId={groupId}
        viewerAccountId={account.id}
        applications={applications}
      />
    </AppShell>
  );
}
