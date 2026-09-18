"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadButton } from "@/components/uploadthing";
import { addProfileDocument, removeProfileDocument } from "@/app/action/personal-profile.action";

export type ProfileDocument = {
  id: string;
  label: string;
  url: string;
  name: string;
};

/** Arbitrary labeled file uploads (KTP, ijazah, transkrip nilai, photo, etc). Unlike the
 * fixed sections above, there's no preset list of documents — the user types whatever
 * label they need before uploading. */
export function DocumentsCard({ documents }: { documents: ProfileDocument[] }) {
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeProfileDocument(id);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Upload whatever files you need to keep with your profile — KTP, ijazah, transkrip
          nilai, KK, a photo, and so on. Name each one yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length > 0 && (
          <ul className="space-y-1">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2">
                <Link
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center gap-2 truncate text-sm hover:underline"
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="font-medium">{doc.label}</span>
                  <span className="text-muted-foreground truncate">{doc.name}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleRemove(doc.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-48"
            placeholder="Document name (e.g. KTP)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <UploadButton
            endpoint="profileDocumentUploader"
            disabled={!label.trim()}
            onClientUploadComplete={(res) => {
              const file = res[0]?.serverData;
              if (!file) return;
              startTransition(async () => {
                const result = await addProfileDocument({ label: label.trim(), ...file });
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(result.message);
                  setLabel("");
                }
              });
            }}
            onUploadError={(error) => {
              toast.error(error.message);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
