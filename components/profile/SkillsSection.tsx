"use client";

import { useState } from "react";
import { useFieldArray, Controller, type Control } from "react-hook-form";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emptySkillCategory } from "@/lib/profile-defaults";
import type { PersonalProfileFormDTO } from "@/servers/validators/personal-profile.validator";

/** Skills — grouped by a free-text category (Soft Skill, Hard Skill, ...), each holding
 * a plain list of tags (e.g. "Public speaking", "Leadership") with no proficiency. */
export function SkillsSection({ control }: { control: Control<PersonalProfileFormDTO> }) {
  const { fields, append, remove } = useFieldArray({ control, name: "skills" });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 rounded-2xl border p-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name={`skills.${index}.category`}
              render={({ field: categoryField }) => (
                <Input className="w-48 font-medium" placeholder="Category" {...categoryField} />
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => remove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Controller
            control={control}
            name={`skills.${index}.skills`}
            render={({ field: skillsField }) => (
              <SkillTagInput value={skillsField.value} onChange={skillsField.onChange} />
            )}
          />
        </div>
      ))}
      {fields.length === 0 && <p className="text-muted-foreground text-sm">No skill categories yet.</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => append(emptySkillCategory())}>
        <Plus className="size-4" />
        Add category
      </Button>
    </div>
  );
}

/** Comma/Enter-separated tag input — lets you add several skills under one category
 * (e.g. "Public speaking", "Leadership" under "Soft Skill") without a proficiency. */
function SkillTagInput({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((tag, index) => (
        <span
          key={tag + index}
          className="flex items-center gap-1 rounded-full border bg-muted/40 py-1 pr-1 pl-2.5 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="rounded-full p-0.5 hover:bg-muted"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Input
        className="h-7 w-36 border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
        placeholder="Add skill..."
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.includes(",")) {
            const parts = raw.split(",");
            addTag(parts[0]);
            setDraft(parts.slice(1).join(","));
          } else {
            setDraft(raw);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(draft);
            setDraft("");
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          addTag(draft);
          setDraft("");
        }}
      />
    </div>
  );
}
