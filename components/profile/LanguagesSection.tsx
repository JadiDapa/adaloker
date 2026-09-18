"use client";

import { useFieldArray, Controller, type Control, type UseFormRegister } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROFICIENCY_LABELS } from "@/lib/profile-defaults";
import {
  ProficiencyLevelValues,
  type PersonalProfileFormDTO,
} from "@/servers/validators/personal-profile.validator";

/** Languages — rendered as a wrap of small "pill" cards (language + level + remove),
 * per the "collection of pills" spec. */
export function LanguagesSection({
  control,
  register,
}: {
  control: Control<PersonalProfileFormDTO>;
  register: UseFormRegister<PersonalProfileFormDTO>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "languages" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pr-1.5 pl-3"
          >
            <Input
              className="h-7 w-28 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="Language"
              {...register(`languages.${index}.label` as const)}
            />
            <Controller
              control={control}
              name={`languages.${index}.proficiency`}
              render={({ field: proficiencyField }) => (
                <Select value={proficiencyField.value} onValueChange={proficiencyField.onChange}>
                  <SelectTrigger size="sm" className="h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ProficiencyLevelValues.map((level) => (
                      <SelectItem key={level} value={level}>
                        {PROFICIENCY_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 rounded-full"
              onClick={() => remove(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      {fields.length === 0 && <p className="text-muted-foreground text-sm">No languages added yet.</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ id: crypto.randomUUID(), label: "", proficiency: "INTERMEDIATE" })}
      >
        <Plus className="size-4" />
        Add language
      </Button>
    </div>
  );
}
