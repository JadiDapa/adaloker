"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMyWhatsappPhone } from "@/app/action/account.action";

export function WhatsappLinkCard({ whatsappPhone }: { whatsappPhone: string | null }) {
  const [value, setValue] = useState(whatsappPhone ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateMyWhatsappPhone({ whatsappPhone: value.trim() });
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
          Link the WhatsApp number you send messages from, so the group bot can tell it&apos;s
          you when you ask it to add a loker. Ask a group owner to link the group chat first
          (Group settings), then send <code className="text-foreground">/loker</code> followed
          by the job details.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="whatsappPhone">Your WhatsApp number</Label>
          <Input
            id="whatsappPhone"
            placeholder="+6281234567890"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
