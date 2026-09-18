"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UploadButton } from "@/components/uploadthing";
import {
  attachApplicationFile,
  deleteApplicationAttachment,
} from "@/app/action/job-application.action";
import type { Attachment } from "./types";

/** List + uploader, shared between the compact table-cell popover and the full detail sheet. */
export function AttachmentsManager({
  groupId,
  applicationId,
  attachments,
}: {
  groupId: string;
  applicationId: string;
  attachments: Attachment[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (attachmentId: string) => {
    startTransition(async () => {
      const result = await deleteApplicationAttachment(groupId, attachmentId);
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No attachments yet.</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center gap-2">
              <Link
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center gap-1.5 truncate text-sm hover:underline"
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={isPending}
                onClick={() => handleDelete(file.id)}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <UploadButton
        endpoint="applicationAttachmentUploader"
        input={{ groupId, applicationId }}
        appearance={{ button: "w-full", container: "w-full" }}
        onClientUploadComplete={(res) => {
          startTransition(async () => {
            for (const { serverData } of res) {
              const result = await attachApplicationFile(groupId, applicationId, serverData);
              if (!result.ok) toast.error(result.error);
            }
          });
        }}
        onUploadError={(error) => {
          toast.error(error.message);
        }}
      />
    </div>
  );
}

export function AttachmentsPopover({
  groupId,
  applicationId,
  attachments,
}: {
  groupId: string;
  applicationId: string;
  attachments: Attachment[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Paperclip className="size-4" />
          {attachments.length > 0 && (
            <span className="text-muted-foreground text-xs">{attachments.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <AttachmentsManager groupId={groupId} applicationId={applicationId} attachments={attachments} />
      </PopoverContent>
    </Popover>
  );
}
