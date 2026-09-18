"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Sparkles, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  JobApplicationFormSchema,
  ApplicationStatusValues,
  type JobApplicationFormDTO,
} from "@/servers/validators/job-application.validator";
import { statusLabel } from "./StatusBadge";
import {
  createJobApplication,
  createJobApplicationFromDump,
  parseJobApplicationDump,
  parseJobApplicationUrl,
} from "@/app/action/job-application.action";
import { SOURCE_PLATFORM_DATALIST_ID } from "./source-platforms";

const EMPTY_FORM: JobApplicationFormDTO = {
  company: "",
  position: "",
  location: "",
  jobUrl: "",
  salary: "",
  sourcePlatform: "",
  status: "APPLIED",
  appliedAt: "",
  notes: "",
};

export function AddApplicationDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add application
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Add job application</SheetTitle>
          <SheetDescription>
            Fill the form manually, or paste anything (an email, a job posting, a note) and let
            AI figure out the fields.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <Tabs defaultValue="dump">
            <TabsList className="w-full">
              <TabsTrigger value="dump" className="flex-1">
                <Sparkles className="size-4" />
                AI dump
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-1">
                <LinkIcon className="size-4" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                Manual
              </TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
              <ApplicationForm
                groupId={groupId}
                defaultValues={EMPTY_FORM}
                onDone={() => setOpen(false)}
              />
            </TabsContent>
            <TabsContent value="dump">
              <AiDumpFlow groupId={groupId} onDone={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="url">
              <UrlDumpFlow groupId={groupId} onDone={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AiDumpFlow({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [extracted, setExtracted] = useState<JobApplicationFormDTO | null>(null);

  const handleParse = () => {
    startTransition(async () => {
      const result = await parseJobApplicationDump(groupId, text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setExtracted({
        company: result.data.company,
        position: result.data.position,
        location: result.data.location ?? "",
        jobUrl: result.data.jobUrl ?? "",
        salary: result.data.salary ?? "",
        sourcePlatform: result.data.sourcePlatform ?? "",
        status: result.data.status,
        appliedAt: result.data.appliedAt ?? "",
        notes: result.data.notes ?? "",
      });
    });
  };

  if (extracted) {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-muted-foreground text-sm">
          Review what the AI found, fix anything off, then save.
        </p>
        <ApplicationForm
          groupId={groupId}
          defaultValues={extracted}
          rawDumpText={text}
          onDone={onDone}
        />
        <Button variant="ghost" size="sm" onClick={() => setExtracted(null)}>
          Back to paste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="dump-text">Paste anything</Label>
        <Textarea
          id="dump-text"
          rows={8}
          placeholder="Paste a confirmation email, a job posting, an interview invite, or just jot down what happened..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={handleParse} disabled={isPending || !text.trim()}>
          <Sparkles className="size-4" />
          {isPending ? "Parsing..." : "Parse with AI"}
        </Button>
      </div>
    </div>
  );
}

function UrlDumpFlow({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [extracted, setExtracted] = useState<JobApplicationFormDTO | null>(null);

  const handleParse = () => {
    startTransition(async () => {
      const result = await parseJobApplicationUrl(groupId, url);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setExtracted({
        company: result.data.company,
        position: result.data.position,
        location: result.data.location ?? "",
        jobUrl: result.data.jobUrl ?? url,
        salary: result.data.salary ?? "",
        sourcePlatform: result.data.sourcePlatform ?? "",
        status: result.data.status,
        appliedAt: result.data.appliedAt ?? "",
        notes: result.data.notes ?? "",
      });
    });
  };

  if (extracted) {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-muted-foreground text-sm">
          Review what the AI found, fix anything off, then save.
        </p>
        <ApplicationForm
          groupId={groupId}
          defaultValues={extracted}
          rawDumpText={url}
          source="URL_DUMP"
          onDone={onDone}
        />
        <Button variant="ghost" size="sm" onClick={() => setExtracted(null)}>
          Back to URL
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="dump-url">Job posting URL</Label>
        <Input
          id="dump-url"
          type="url"
          placeholder="https://www.jobstreet.co.id/job/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Works for most job listing pages. Sites that require login (e.g. LinkedIn) may not
          work — paste the text into &ldquo;AI dump&rdquo; instead.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={handleParse} disabled={isPending || !url.trim()}>
          <LinkIcon className="size-4" />
          {isPending ? "Fetching..." : "Fetch & parse"}
        </Button>
      </div>
    </div>
  );
}

function ApplicationForm({
  groupId,
  defaultValues,
  rawDumpText,
  source,
  onDone,
}: {
  groupId: string;
  defaultValues: JobApplicationFormDTO;
  rawDumpText?: string;
  source?: "AI_DUMP" | "URL_DUMP";
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<JobApplicationFormDTO>({
    resolver: zodResolver(JobApplicationFormSchema),
    defaultValues,
  });

  const status = watch("status");

  const onSubmit = (data: JobApplicationFormDTO) => {
    startTransition(async () => {
      const result = rawDumpText
        ? await createJobApplicationFromDump(groupId, data, rawDumpText, source ?? "AI_DUMP")
        : await createJobApplication(groupId, data);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" {...register("company")} />
          {errors.company && <p className="text-destructive text-sm">{errors.company.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input id="position" {...register("position")} />
          {errors.position && (
            <p className="text-destructive text-sm">{errors.position.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Salary</Label>
          <Input id="salary" {...register("salary")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jobUrl">Job URL</Label>
          <Input id="jobUrl" {...register("jobUrl")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourcePlatform">Source</Label>
          <Input
            id="sourcePlatform"
            list={SOURCE_PLATFORM_DATALIST_ID}
            placeholder="LinkedIn, Glints, JobStreet..."
            {...register("sourcePlatform")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Your status</Label>
          <Select value={status} onValueChange={(v) => setValue("status", v as typeof status)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ApplicationStatusValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Other members track their own status for this job separately.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="appliedAt">Application date</Label>
          <Input id="appliedAt" type="date" {...register("appliedAt")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Note</Label>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ""} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save application"}
        </Button>
      </div>
    </form>
  );
}
