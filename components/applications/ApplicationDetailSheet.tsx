"use client";

import { type ReactNode, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { Ban, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, statusLabel } from "./StatusBadge";
import { RichTextViewer } from "@/components/ui/rich-text-editor";
import { AttachmentsManager } from "./AttachmentsPopover";
import { EditableField, SalaryField } from "./EditableField";
import { SOURCE_PLATFORM_DATALIST_ID } from "./source-platforms";
import {
  updateMyApplicationStatus,
  updateJobApplicationFields,
} from "@/app/action/job-application.action";
import { ApplicationStatusValues } from "@/servers/validators/job-application.validator";
import type { ApplicationStatus } from "@/generated/prisma";
import { firstName } from "@/lib/utils";
import type { Application } from "./types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function ApplicationDetailSheet({
  groupId,
  viewerAccountId,
  application,
  children,
}: {
  groupId: string;
  viewerAccountId: string;
  application: Application;
  children: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  const myStatusRow = application.memberStatuses.find((m) => m.accountId === viewerAccountId);
  const myStatus: ApplicationStatus = myStatusRow?.status ?? "WISHLIST";
  const myAppliedAt = myStatusRow?.appliedAt ?? null;

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      const result = await updateMyApplicationStatus(groupId, application.id, {
        status,
        ...(status !== "WISHLIST" && !myAppliedAt
          ? { appliedAt: new Date().toISOString().slice(0, 10) }
          : {}),
      });
      if (!result.ok) toast.error(result.error);
    });
  };

  const handleMarkNotInterested = () => {
    startTransition(async () => {
      const result = await updateMyApplicationStatus(groupId, application.id, {
        status: "NOT_INTERESTED",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as not interested");
    });
  };

  const handleAppliedAtChange = (value: string) => {
    startTransition(async () => {
      const result = await updateMyApplicationStatus(groupId, application.id, { appliedAt: value });
      if (!result.ok) toast.error(result.error);
    });
  };

  const handleFieldSave = (
    field: "company" | "position" | "location" | "jobUrl" | "salary" | "sourcePlatform",
    value: string,
  ) => {
    startTransition(async () => {
      const result = await updateJobApplicationFields(groupId, application.id, {
        [field]: value,
      });
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-4 right-12 text-muted-foreground hover:text-destructive"
          title="Not interested"
          onClick={handleMarkNotInterested}
          disabled={isPending || myStatus === "NOT_INTERESTED"}
        >
          <Ban />
          <span className="sr-only">Mark as not interested</span>
        </Button>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1.5">
            <EditableField
              value={application.company}
              onSave={(v) => handleFieldSave("company", v)}
              required
              variant="inline"
              className="text-base font-medium text-foreground"
            />
            {application.source === "AI_DUMP" && (
              <Sparkles className="text-muted-foreground size-3.5 shrink-0" />
            )}
          </SheetTitle>
          <SheetDescription asChild>
            <span>
              <EditableField
                value={application.position}
                onSave={(v) => handleFieldSave("position", v)}
                required
                variant="inline"
                className="text-sm text-muted-foreground"
              />
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className={`flex-1 space-y-6 overflow-y-auto px-6 pb-6 ${isPending ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your status">
              <Select value={myStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-auto w-auto border-none p-0 shadow-none [&_svg]:hidden">
                  <StatusBadge status={myStatus} />
                </SelectTrigger>
                <SelectContent>
                  {ApplicationStatusValues.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Your application date">
              <Input
                type="date"
                className="h-8"
                defaultValue={myAppliedAt ? format(myAppliedAt, "yyyy-MM-dd") : ""}
                onChange={(e) => handleAppliedAtChange(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Location">
              <EditableField
                value={application.location ?? ""}
                onSave={(v) => handleFieldSave("location", v)}
                placeholder="—"
                variant="field"
              />
            </Field>
            <Field label="Salary">
              <SalaryField
                value={application.salary ?? ""}
                onSave={(v) => handleFieldSave("salary", v)}
                variant="field"
              />
            </Field>
          </div>

          <Field label="Link">
            <div className="flex items-center gap-1.5">
              <EditableField
                value={application.jobUrl ?? ""}
                onSave={(v) => handleFieldSave("jobUrl", v)}
                placeholder="—"
                variant="field"
                className="flex-1"
              />
              {application.jobUrl && (
                <Link
                  href={application.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Open link"
                >
                  <ExternalLink className="size-3.5" />
                </Link>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Source">
              <EditableField
                value={application.sourcePlatform ?? ""}
                onSave={(v) => handleFieldSave("sourcePlatform", v)}
                placeholder="—"
                variant="field"
                list={SOURCE_PLATFORM_DATALIST_ID}
              />
            </Field>
            <Field label="Added by">{firstName(application.createdBy.name)}</Field>
          </div>

          <Separator />

          <Field label="Everyone's progress">
            {application.memberStatuses.length === 0 ? (
              <p className="text-muted-foreground">Nobody has set a status yet.</p>
            ) : (
              <ul className="space-y-2">
                {application.memberStatuses.map((m) => (
                  <li key={m.accountId} className="flex items-center justify-between gap-2">
                    <span>{firstName(m.account.name)}</span>
                    <div className="flex items-center gap-2">
                      {m.appliedAt && (
                        <span className="text-muted-foreground text-xs">
                          {format(m.appliedAt, "MMM d, yyyy")}
                        </span>
                      )}
                      <StatusBadge status={m.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Separator />

          <div className="space-y-1">
            <Label>Note</Label>
            {application.notes ? (
              <RichTextViewer html={application.notes} />
            ) : (
              <p className="text-muted-foreground text-sm">No note yet.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <Label>Attachments</Label>
            <AttachmentsManager
              groupId={groupId}
              applicationId={application.id}
              attachments={application.attachments}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
