import { z } from "zod";
import { Type } from "@google/genai";
import { gemini, AI_DUMP_MODEL } from "@/lib/gemini";
import {
  EducationEntrySchema,
  ExperienceEntrySchema,
  LinksSchema,
  type PersonalProfileFormDTO,
} from "@/servers/validators/personal-profile.validator";
import {
  DEFAULT_CONTACT_LABELS,
  DEFAULT_EDUCATION_ENTRY_LABELS,
  DEFAULT_PERSONAL_DATA_LABELS,
  DEFAULT_WORK_ENTRY_LABELS,
  emptyKeyValueList,
} from "@/lib/profile-defaults";

const ExtractedProfileSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
  education: z.array(EducationEntrySchema),
  experience: z.array(ExperienceEntrySchema),
  links: LinksSchema,
});

export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fullName: { type: Type.STRING, nullable: true },
    email: { type: Type.STRING, nullable: true },
    phone: { type: Type.STRING, nullable: true },
    location: { type: Type.STRING, nullable: true },
    summary: {
      type: Type.STRING,
      nullable: true,
      description: "A short professional summary/objective, if present or inferable.",
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Flat list of skills/technologies mentioned.",
    },
    languages: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Spoken/written languages mentioned (e.g. English, Indonesian), not programming languages.",
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          school: { type: Type.STRING },
          degree: { type: Type.STRING, nullable: true },
          field: { type: Type.STRING, nullable: true },
          startDate: { type: Type.STRING, nullable: true },
          endDate: { type: Type.STRING, nullable: true },
        },
        required: ["school", "degree", "field", "startDate", "endDate"],
      },
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          startDate: { type: Type.STRING, nullable: true },
          endDate: {
            type: Type.STRING,
            nullable: true,
            description: "Null/omit if this is the current role.",
          },
          description: { type: Type.STRING, nullable: true },
        },
        required: ["company", "title", "startDate", "endDate", "description"],
      },
    },
    links: {
      type: Type.OBJECT,
      properties: {
        linkedin: { type: Type.STRING, nullable: true },
        github: { type: Type.STRING, nullable: true },
        portfolio: { type: Type.STRING, nullable: true },
      },
      required: ["linkedin", "github", "portfolio"],
    },
  },
  required: [
    "fullName",
    "email",
    "phone",
    "location",
    "summary",
    "skills",
    "languages",
    "education",
    "experience",
    "links",
  ],
};

export async function parseProfileDump(text: string): Promise<ExtractedProfile> {
  const response = await gemini.models.generateContent({
    model: AI_DUMP_MODEL,
    contents: `Extract structured profile/CV details from this text (a resume, CV, or bio):\n\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error("The AI did not return a structured result. Try again.");
  }

  return ExtractedProfileSchema.parse(JSON.parse(response.text));
}

function fieldValue(labels: string[], label: string, value: string | null) {
  return labels.map((l) => ({ id: crypto.randomUUID(), label: l, value: l === label ? (value ?? "") : "" }));
}

/** Maps the AI's fixed CV extraction onto the dynamic profile shape, using the same
 * default field labels a fresh manual profile would start with. The AI has no way to
 * know about fields the user added/removed themselves, so this always resets the form
 * to defaults + whatever it found — same as the old behavior of `reset()`-ing the whole
 * form from a dump. */
export function mapExtractedProfileToForm(extracted: ExtractedProfile): PersonalProfileFormDTO {
  const personalData = fieldValue(DEFAULT_PERSONAL_DATA_LABELS, "Fullname", extracted.fullName);
  if (extracted.summary) personalData.push({ id: crypto.randomUUID(), label: "Summary", value: extracted.summary });

  const contactInfo = emptyKeyValueList(DEFAULT_CONTACT_LABELS).map((field) => {
    switch (field.label) {
      case "Phone number":
        return { ...field, value: extracted.phone ?? "" };
      case "Email address":
        return { ...field, value: extracted.email ?? "" };
      case "Address":
        return { ...field, value: extracted.location ?? "" };
      case "LinkedIn":
        return { ...field, value: extracted.links.linkedin ?? "" };
      case "Github":
        return { ...field, value: extracted.links.github ?? "" };
      case "Website":
        return { ...field, value: extracted.links.portfolio ?? "" };
      default:
        return field;
    }
  });

  const educations = extracted.education.map((entry) => {
    const period = [entry.startDate, entry.endDate].filter(Boolean).join(" - ");
    const values: Record<string, string> = {
      Jenjang: entry.degree ?? "",
      "Nama Sekolah": entry.school,
      Jurusan: entry.field ?? "",
      Periode: period,
    };
    return {
      id: crypto.randomUUID(),
      fields: DEFAULT_EDUCATION_ENTRY_LABELS.map((label) => ({
        id: crypto.randomUUID(),
        label,
        value: values[label] ?? "",
      })),
    };
  });

  const workExperience = extracted.experience.map((entry) => {
    const period = [entry.startDate, entry.endDate].filter(Boolean).join(" - ");
    const values: Record<string, string> = {
      "Nama Perusahaan": entry.company,
      Posisi: entry.title,
      "Tahun Kerja": period,
      Detail: entry.description ?? "",
    };
    return {
      id: crypto.randomUUID(),
      fields: DEFAULT_WORK_ENTRY_LABELS.map((label) => ({
        id: crypto.randomUUID(),
        label,
        value: values[label] ?? "",
      })),
    };
  });

  const skills = extracted.skills.length
    ? [{ id: crypto.randomUUID(), category: "Hard Skill", skills: extracted.skills }]
    : [];

  const languages = extracted.languages.map((label) => ({
    id: crypto.randomUUID(),
    label,
    proficiency: "INTERMEDIATE" as const,
  }));

  return {
    personalData,
    contactInfo,
    educations,
    workExperience,
    organizations: [],
    skills,
    languages,
  };
}
