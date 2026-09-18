"use client";

import { useFieldArray, Controller, type Control } from "react-hook-form";
import { NotebookText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DEFAULT_WORK_ENTRY_LABELS, emptyEntry } from "@/lib/profile-defaults";
import type { PersonalProfileFormDTO } from "@/servers/validators/personal-profile.validator";

/** Fixed table columns for Work Experience — index matches the field order every entry
 * is created with (DEFAULT_WORK_ENTRY_LABELS). Unlike Education/Organizations, this
 * section is a real table instead of free-form per-row fields: everything except
 * "Detail" edits inline in the cell, "Detail" (a paragraph) only opens in a sheet
 * alongside the rest of the row, since it doesn't fit a table cell. */
const COLUMNS = DEFAULT_WORK_ENTRY_LABELS.filter((label) => label !== "Detail");
const DETAIL_INDEX = DEFAULT_WORK_ENTRY_LABELS.indexOf("Detail");

export function WorkExperienceSection({ control }: { control: Control<PersonalProfileFormDTO> }) {
  const { fields, append, remove } = useFieldArray({ control, name: "workExperience" });

  return (
    <div className="space-y-3">
      {fields.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((label) => (
                <TableHead key={label}>{label}</TableHead>
              ))}
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((entry, index) => (
              <TableRow key={entry.id}>
                {COLUMNS.map((label, colIndex) => (
                  <TableCell key={label}>
                    <Controller
                      control={control}
                      name={`workExperience.${index}.fields.${colIndex}.value`}
                      render={({ field }) => (
                        <Input className="h-8 w-36 min-w-0" placeholder={label} {...field} />
                      )}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DetailSheet control={control} entryIndex={index} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-sm">No work experience added yet.</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append(emptyEntry(DEFAULT_WORK_ENTRY_LABELS))}
      >
        <Plus className="size-4" />
        Add work experience
      </Button>
    </div>
  );
}

/** All of the row's fields, including "Detail" — a bigger surface for the paragraph
 * field, while the others stay editable here too (they also edit inline in the table). */
function DetailSheet({ control, entryIndex }: { control: Control<PersonalProfileFormDTO>; entryIndex: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon">
          <NotebookText className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Work experience detail</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-6 pb-6">
          {COLUMNS.map((label, colIndex) => (
            <div key={label} className="space-y-1.5">
              <Label>{label}</Label>
              <Controller
                control={control}
                name={`workExperience.${entryIndex}.fields.${colIndex}.value`}
                render={({ field }) => <Input {...field} />}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Detail</Label>
            <Controller
              control={control}
              name={`workExperience.${entryIndex}.fields.${DETAIL_INDEX}.value`}
              render={({ field }) => <Textarea rows={6} {...field} />}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
