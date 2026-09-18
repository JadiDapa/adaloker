"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PersonalProfileFormSchema,
  type PersonalProfileFormDTO,
} from "@/servers/validators/personal-profile.validator";
import { saveProfile, saveProfileFromDump, parseProfileDumpAction } from "@/app/action/personal-profile.action";
import {
  DEFAULT_EDUCATION_ENTRY_LABELS,
  DEFAULT_ORGANIZATION_ENTRY_LABELS,
  DEFAULT_WORK_ENTRY_LABELS,
} from "@/lib/profile-defaults";
import { KeyValueSection } from "./KeyValueSection";
import { EntryListSection } from "./EntryListSection";
import { SkillsSection } from "./SkillsSection";
import { LanguagesSection } from "./LanguagesSection";

export function ProfileForm({ defaultValues }: { defaultValues: PersonalProfileFormDTO }) {
  const [dumpText, setDumpText] = useState("");
  const [isParsing, startParsing] = useTransition();
  const [rawDumpText, setRawDumpText] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    control,
    reset,
  } = useForm<PersonalProfileFormDTO>({
    resolver: zodResolver(PersonalProfileFormSchema),
    defaultValues,
  });

  const [isSaving, startSaving] = useTransition();

  const handleParse = () => {
    startParsing(async () => {
      const result = await parseProfileDumpAction(dumpText);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      reset(result.data);
      setRawDumpText(dumpText);
      toast.success("Filled the form below from your dump — review it before saving.");
    });
  };

  const onSubmit = (data: PersonalProfileFormDTO) => {
    startSaving(async () => {
      const result = rawDumpText
        ? await saveProfileFromDump(data, rawDumpText)
        : await saveProfile(data);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            AI dump
          </CardTitle>
          <CardDescription>
            Paste your CV, LinkedIn &quot;About&quot; section, or just a bio &mdash; it&apos;ll
            fill the form below for you to review before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            placeholder="Paste your CV or bio text here..."
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
          />
          <Button type="button" onClick={handleParse} disabled={isParsing || !dumpText.trim()}>
            <Sparkles className="size-4" />
            {isParsing ? "Parsing..." : "Parse with AI"}
          </Button>
        </CardContent>
      </Card>

      <form
        onSubmit={handleSubmit(onSubmit, () =>
          toast.error("Some fields are missing a name — fill in or remove them before saving."),
        )}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Personal Data</CardTitle>
            <CardDescription>Add or remove fields as you need — nothing here is fixed.</CardDescription>
          </CardHeader>
          <CardContent>
            <KeyValueSection control={control} register={register} name="personalData" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueSection control={control} register={register} name="contactInfo" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Educations</CardTitle>
          </CardHeader>
          <CardContent>
            <EntryListSection
              control={control}
              register={register}
              name="educations"
              defaultLabels={DEFAULT_EDUCATION_ENTRY_LABELS}
              addLabel="Add education"
              emptyLabel="No education added yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <EntryListSection
              control={control}
              register={register}
              name="workExperience"
              defaultLabels={DEFAULT_WORK_ENTRY_LABELS}
              addLabel="Add work experience"
              emptyLabel="No work experience added yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <EntryListSection
              control={control}
              register={register}
              name="organizations"
              defaultLabels={DEFAULT_ORGANIZATION_ENTRY_LABELS}
              addLabel="Add organization"
              emptyLabel="No organization experience added yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Group them under whatever categories make sense to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillsSection control={control} register={register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguagesSection control={control} register={register} />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
