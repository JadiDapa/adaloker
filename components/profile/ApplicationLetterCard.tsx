"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  saveLetterTemplate,
  generateApplicationLetter,
  deleteApplicationLetter,
} from "@/app/action/application-letter.action";

type ApplicationLetter = {
  id: string;
  companyName: string;
  position: string;
  date: Date;
  pdfUrl: string;
  pdfName: string;
  expiresAt: Date;
};

export function ApplicationLetterCard({
  letterTemplate,
  letters,
}: {
  letterTemplate: string | null;
  letters: ApplicationLetter[];
}) {
  const [template, setTemplate] = useState(letterTemplate ?? "");
  const [isSavingTemplate, startSavingTemplate] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [genOpen, setGenOpen] = useState(false);

  const handleSaveTemplate = () => {
    startSavingTemplate(async () => {
      const result = await saveLetterTemplate(template);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  };

  const handleDelete = (letterId: string) => {
    startDeleting(async () => {
      const result = await deleteApplicationLetter(letterId);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application letter</CardTitle>
        <CardDescription>
          Write a reusable letter template with <code>{"{{date}}"}</code>,{" "}
          <code>{"{{company}}"}</code>, and <code>{"{{position}}"}</code> placeholders. Each
          generated letter is kept as a PDF for {"7 days"}, then automatically deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="letter-template">Letter template</Label>
          <Textarea
            id="letter-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={10}
            placeholder={
              "{{date}}\nDear Hiring Team,\n{{company}}\nI am ..., applying for the {{position}} position at {{company}}...."
            }
          />
          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={handleSaveTemplate} disabled={isSavingTemplate}>
              Save template
            </Button>
            <GenerateLetterDialog open={genOpen} onOpenChange={setGenOpen} hasTemplate={!!template.trim()} />
          </div>
        </div>

        {letters.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            {letters.map((letter) => (
              <div key={letter.id} className="flex items-center gap-3 text-sm">
                <Link
                  href={letter.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center gap-2 hover:underline"
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate">
                    {letter.companyName} — {letter.position}
                  </span>
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs">
                  expires in {formatDistanceToNowStrict(letter.expiresAt)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(letter.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GenerateLetterDialog({
  open,
  onOpenChange,
  hasTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTemplate: boolean;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateApplicationLetter({ date, companyName, position });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setCompanyName("");
      setPosition("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!hasTemplate}>
          <Plus className="size-4" />
          Generate letter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate application letter</DialogTitle>
          <DialogDescription>
            Fills your saved template and renders it as a PDF, kept for 7 days.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="letter-date">Date</Label>
            <Input id="letter-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="letter-company">Company name</Label>
            <Input
              id="letter-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Schneider Electric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="letter-position">Position</Label>
            <Input
              id="letter-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Electrical Design Engineer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={isPending || !companyName.trim() || !position.trim() || !date}
          >
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
