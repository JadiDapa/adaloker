import { z } from "zod";

export const ProficiencyLevelValues = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
  "NATIVE",
] as const;
export const ProficiencyLevelSchema = z.enum(ProficiencyLevelValues);
export type ProficiencyLevel = z.infer<typeof ProficiencyLevelSchema>;

/** One user-defined label/value pair -- the building block of every free-form section. */
export const KeyValueFieldSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, "Field name is required").max(100),
  value: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type KeyValueFieldDTO = z.infer<typeof KeyValueFieldSchema>;

export const KeyValueListSchema = z.array(KeyValueFieldSchema).max(50);

/** One row in a table-like section (Education/Work Experience/Organizations) -- its
 * own free-form set of fields, since each entry's columns can also be customized. */
export const EntrySchema = z.object({
  id: z.string(),
  fields: KeyValueListSchema,
});
export type EntryDTO = z.infer<typeof EntrySchema>;

export const EntryListSchema = z.array(EntrySchema).max(30);

export const SkillItemSchema = z.object({
  id: z.string(),
  category: z.string().trim().min(1, "Category is required").max(100),
  label: z.string().trim().min(1, "Skill name is required").max(100),
  proficiency: ProficiencyLevelSchema,
});
export type SkillItemDTO = z.infer<typeof SkillItemSchema>;

export const SkillListSchema = z.array(SkillItemSchema).max(200);

export const LanguageItemSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, "Language is required").max(100),
  proficiency: ProficiencyLevelSchema,
});
export type LanguageItemDTO = z.infer<typeof LanguageItemSchema>;

export const LanguageListSchema = z.array(LanguageItemSchema).max(50);

export const PersonalProfileFormSchema = z.object({
  personalData: KeyValueListSchema,
  contactInfo: KeyValueListSchema,
  educations: EntryListSchema,
  workExperience: EntryListSchema,
  organizations: EntryListSchema,
  skills: SkillListSchema,
  languages: LanguageListSchema,
});
export type PersonalProfileFormDTO = z.infer<typeof PersonalProfileFormSchema>;

export const AiProfileDumpSchema = z.object({
  text: z.string().trim().min(1, "Paste something to parse").max(30000),
});
export type AiProfileDumpDTO = z.infer<typeof AiProfileDumpSchema>;

/** Shapes returned by the Gemini "AI dump" extraction (lib/ai/parse-profile-dump.ts) --
 * a fixed, well-known CV shape, distinct from the free-form Entry/KeyValueField shapes
 * above. Mapped into the dynamic PersonalProfileFormDTO after extraction. */
export const EducationEntrySchema = z.object({
  school: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const ExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
});

export const LinksSchema = z.object({
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  portfolio: z.string().nullable(),
});

export const AddProfileDocumentSchema = z.object({
  label: z.string().trim().min(1, "Document name is required").max(100),
  url: z.string().trim().min(1),
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
});
export type AddProfileDocumentDTO = z.infer<typeof AddProfileDocumentSchema>;
