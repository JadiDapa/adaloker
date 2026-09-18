"use client";

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blankField } from "@/lib/profile-defaults";
import type { PersonalProfileFormDTO } from "@/servers/validators/personal-profile.validator";

/** Renders "personalData"/"contactInfo" — a free-form list of label/value rows the
 * user can rename, remove, or add to. Both sections share this exact same shape. */
export function KeyValueSection({
  control,
  register,
  name,
}: {
  control: Control<PersonalProfileFormDTO>;
  register: UseFormRegister<PersonalProfileFormDTO>;
  name: "personalData" | "contactInfo";
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2">
          <Input
            className="w-40 shrink-0"
            placeholder="Field name"
            {...register(`${name}.${index}.label` as const)}
          />
          <Input className="flex-1" placeholder="Value" {...register(`${name}.${index}.value` as const)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => remove(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {fields.length === 0 && <p className="text-muted-foreground text-sm">No fields added yet.</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => append(blankField())}>
        <Plus className="size-4" />
        Add field
      </Button>
    </div>
  );
}
