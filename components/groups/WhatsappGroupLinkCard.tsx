"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setGroupWhatsappJid } from "@/app/action/group.action";

export function WhatsappGroupLinkCard({
  groupId,
  whatsappGroupJid,
  isOwner,
}: {
  groupId: string;
  whatsappGroupJid: string | null;
  isOwner: boolean;
}) {
  const [value, setValue] = useState(whatsappGroupJid ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await setGroupWhatsappJid(groupId, value.trim());
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
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4" />
          WhatsApp bot
        </CardTitle>
        <CardDescription>
          Add the bot number to this group&apos;s WhatsApp chat, then send{" "}
          <code className="text-foreground">/id</code> in the chat — the bot replies with the
          group&apos;s JID to paste below. Once linked, any member with a WhatsApp number saved
          on their profile can send <code className="text-foreground">/loker</code> followed by
          job details to add it to this board.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="whatsappGroupJid">WhatsApp group JID</Label>
          <Input
            id="whatsappGroupJid"
            placeholder="1203xxxxxxxxxx@g.us"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!isOwner}
          />
        </div>
        {isOwner && (
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
