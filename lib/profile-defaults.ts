import type {
  EntryDTO,
  KeyValueFieldDTO,
  PersonalProfileFormDTO,
  ProficiencyLevel,
} from "@/servers/validators/personal-profile.validator";

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
  NATIVE: "Native",
};

/** Starting label set for a brand-new profile/entry -- purely a convenience seed, the
 * user is free to rename, remove, or add to these once the form is on screen. */
export const DEFAULT_PERSONAL_DATA_LABELS = [
  "Fullname",
  "Date of birth",
  "Gender",
  "Nationality",
  "Marital Status",
  "Religion",
  "KTP",
];

export const DEFAULT_CONTACT_LABELS = [
  "Phone number",
  "Email address",
  "Address",
  "LinkedIn",
  "Instagram",
  "Github",
  "Website",
];

export const DEFAULT_EDUCATION_ENTRY_LABELS = [
  "Jenjang",
  "Nama Sekolah",
  "Jurusan",
  "Periode",
  "Keahlian / Kursus",
  "Nilai",
  "Detail",
];

export const DEFAULT_WORK_ENTRY_LABELS = [
  "Nama Perusahaan",
  "Posisi",
  "Tahun Kerja",
  "Salary",
  "Nama Atasan",
  "No Atasan",
  "Detail",
];

export const DEFAULT_ORGANIZATION_ENTRY_LABELS = [
  "Nama Organisasi",
  "Posisi",
  "Tahun Kerja",
  "Detail",
];

export const DEFAULT_SKILL_CATEGORIES = [
  "Soft Skill",
  "Hard Skill",
  "Programming Language",
  "Language",
];

function newId() {
  return crypto.randomUUID();
}

export function emptyKeyValueList(labels: string[]): KeyValueFieldDTO[] {
  return labels.map((label) => ({ id: newId(), label, value: "" }));
}

export function emptyEntry(labels: string[]): EntryDTO {
  return { id: newId(), fields: emptyKeyValueList(labels) };
}

export function blankField(): KeyValueFieldDTO {
  return { id: newId(), label: "", value: "" };
}

/** Seed values for a profile that has never been saved before. Once a profile exists,
 * its stored JSON (whatever fields the user kept) is used as-is -- this is only the
 * first-run default. */
export function emptyProfileForm(): PersonalProfileFormDTO {
  return {
    personalData: emptyKeyValueList(DEFAULT_PERSONAL_DATA_LABELS),
    contactInfo: emptyKeyValueList(DEFAULT_CONTACT_LABELS),
    educations: [emptyEntry(DEFAULT_EDUCATION_ENTRY_LABELS)],
    workExperience: [emptyEntry(DEFAULT_WORK_ENTRY_LABELS)],
    organizations: [emptyEntry(DEFAULT_ORGANIZATION_ENTRY_LABELS)],
    skills: [],
    languages: [],
  };
}
