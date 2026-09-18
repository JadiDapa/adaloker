"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadButton } from "@/components/uploadthing";
import { saveResume, removeResume } from "@/app/action/personal-profile.action";

export function ResumeCard({
  resumeUrl,
  resumeName,
}: {
  resumeUrl: string | null;
  resumeName: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeResume();
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume</CardTitle>
        <CardDescription>
          Upload a PDF of your resume/CV — kept alongside your profile for quick reference.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        {resumeUrl ? (
          <>
            <Link
              href={resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center gap-2 text-sm hover:underline"
            >
              <FileText className="size-4" />
              {resumeName ?? "resume.pdf"}
            </Link>
            <Button variant="ghost" size="icon" onClick={handleRemove} disabled={isPending}>
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : (
          <UploadButton
            endpoint="resumeUploader"
            onClientUploadComplete={(res) => {
              const file = res[0]?.serverData;
              if (!file) return;
              startTransition(async () => {
                const result = await saveResume(file);
                if (!result.ok) toast.error(result.error);
                else toast.success(result.message);
              });
            }}
            onUploadError={(error) => {
              toast.error(error.message);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
