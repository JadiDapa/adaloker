"use client";

import { useFieldArray, Controller, type Control, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_SKILL_CATEGORIES, PROFICIENCY_LABELS } from "@/lib/profile-defaults";
import {
  ProficiencyLevelValues,
  type PersonalProfileFormDTO,
} from "@/servers/validators/personal-profile.validator";

/** Skills — free-form category (Soft Skill, Hard Skill, ...) + label + proficiency per
 * row. Categories are plain text, not an enum, so the user can add their own. */
export function SkillsSection({
  control,
  register,
}: {
  control: Control<PersonalProfileFormDTO>;
  register: UseFormRegister<PersonalProfileFormDTO>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "skills" });

  return (
    <div className="space-y-3">
      <datalist id="skill-categories">
        {DEFAULT_SKILL_CATEGORIES.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-wrap items-center gap-2">
          <Input
            className="w-40 shrink-0"
            placeholder="Category"
            list="skill-categories"
            {...register(`skills.${index}.category` as const)}
          />
          <Input
            className="flex-1 min-w-32"
            placeholder="Skill"
            {...register(`skills.${index}.label` as const)}
          />
          <Controller
            control={control}
            name={`skills.${index}.proficiency`}
            render={({ field: proficiencyField }) => (
              <Select value={proficiencyField.value} onValueChange={proficiencyField.onChange}>
                <SelectTrigger size="sm" className="w-36">
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
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {fields.length === 0 && <p className="text-muted-foreground text-sm">No skills added yet.</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            category: DEFAULT_SKILL_CATEGORIES[0],
            label: "",
            proficiency: "INTERMEDIATE",
          })
        }
      >
        <Plus className="size-4" />
        Add skill
      </Button>
    </div>
  );
}
