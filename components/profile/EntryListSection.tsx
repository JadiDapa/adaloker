"use client";

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { blankField, emptyEntry } from "@/lib/profile-defaults";
import type { PersonalProfileFormDTO } from "@/servers/validators/personal-profile.validator";

type EntrySectionName = "educations" | "workExperience" | "organizations";

/** Renders a table-like section (Education/Work Experience/Organizations) as a list of
 * entry cards. Each entry has its own free-form set of label/value fields — adding a
 * field to one entry doesn't affect the others, since each row's columns are
 * independently customizable. */
export function EntryListSection({
  control,
  register,
  name,
  defaultLabels,
  addLabel = "Add entry",
  emptyLabel = "Nothing added yet.",
}: {
  control: Control<PersonalProfileFormDTO>;
  register: UseFormRegister<PersonalProfileFormDTO>;
  name: EntrySectionName;
  defaultLabels: string[];
  addLabel?: string;
  emptyLabel?: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-4">
      {fields.map((entry, index) => (
        <div key={entry.id} className="space-y-3">
          {index > 0 && <Separator />}
          <EntryFields control={control} register={register} name={name} entryIndex={index} />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
            <Trash2 className="size-4" />
            Remove entry
          </Button>
        </div>
      ))}
      {fields.length === 0 && <p className="text-muted-foreground text-sm">{emptyLabel}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append(emptyEntry(defaultLabels))}
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

function EntryFields({
  control,
  register,
  name,
  entryIndex,
}: {
  control: Control<PersonalProfileFormDTO>;
  register: UseFormRegister<PersonalProfileFormDTO>;
  name: EntrySectionName;
  entryIndex: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${name}.${entryIndex}.fields` as const,
  });

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map((field, fieldIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <Input
            className="w-32 shrink-0 text-xs"
            placeholder="Field name"
            {...register(`${name}.${entryIndex}.fields.${fieldIndex}.label` as const)}
          />
          <Input
            className="flex-1"
            placeholder="Value"
            {...register(`${name}.${entryIndex}.fields.${fieldIndex}.value` as const)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => remove(fieldIndex)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start sm:col-span-2"
        onClick={() => append(blankField())}
      >
        <Plus className="size-3.5" />
        Add field
      </Button>
    </div>
  );
}
