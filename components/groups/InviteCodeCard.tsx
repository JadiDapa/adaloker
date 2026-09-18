"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { regenerateInviteCode } from "@/app/action/group.action";

export function InviteCodeCard({
  groupId,
  inviteCode,
  isOwner,
}: {
  groupId: string;
  inviteCode: string;
  isOwner: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied");
  };

  const handleRegenerate = () => {
    startTransition(async () => {
      const result = await regenerateInviteCode(groupId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite code</CardTitle>
        <CardDescription>Share this with friends so they can join the group.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <code className="neu-pressed-sm flex-1 rounded-xl bg-background px-3 py-2 font-mono text-lg tracking-widest">
          {inviteCode}
        </code>
        <Button variant="outline" size="icon" onClick={handleCopy}>
          <Copy className="size-4" />
        </Button>
        {isOwner && (
          <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={isPending}>
            <RefreshCw className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
