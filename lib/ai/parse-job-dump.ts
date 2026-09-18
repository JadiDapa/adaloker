import { z } from "zod";
import { Type } from "@google/genai";
import { gemini, AI_DUMP_MODEL } from "@/lib/gemini";
import { ApplicationStatus } from "@/generated/prisma";

const ExtractedJobApplicationSchema = z.object({
  company: z.string(),
  position: z.string(),
  location: z.string().nullable(),
  jobUrl: z.string().nullable(),
  salary: z.string().nullable(),
  sourcePlatform: z.string().nullable(),
  status: z.enum(Object.values(ApplicationStatus) as [ApplicationStatus, ...ApplicationStatus[]]),
  appliedAt: z.string().nullable(),
  notes: z.string().nullable(),
});

export type ExtractedJobApplication = z.infer<typeof ExtractedJobApplicationSchema>;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    company: { type: Type.STRING, description: "Company/organization name." },
    position: { type: Type.STRING, description: "Job title/role applied for." },
    location: {
      type: Type.STRING,
      nullable: true,
      description: "City/remote/hybrid, if mentioned.",
    },
    jobUrl: {
      type: Type.STRING,
      nullable: true,
      description: "Job posting or application URL, if present.",
    },
    salary: {
      type: Type.STRING,
      nullable: true,
      description: "Salary or compensation range, if mentioned.",
    },
    sourcePlatform: {
      type: Type.STRING,
      nullable: true,
      description:
        "The job board/platform this was found or applied through, if evident (e.g. LinkedIn, Glints, JobStreet, Indeed, Disnaker, company careers page, referral).",
    },
    status: {
      type: Type.STRING,
      enum: Object.values(ApplicationStatus),
      description:
        "Best guess at the current stage. Default to APPLIED unless the text clearly indicates otherwise (e.g. an interview invite -> INTERVIEW, an offer letter -> OFFER, a rejection -> REJECTED, a screening assessment -> OA).",
    },
    appliedAt: {
      type: Type.STRING,
      nullable: true,
      description:
        "Date applied or the date of this email/event, as an ISO 8601 date (YYYY-MM-DD), if mentioned or inferable.",
    },
    notes: {
      type: Type.STRING,
      nullable: true,
      description:
        "Any other relevant detail worth keeping (recruiter name, next steps, deadlines, etc). Keep it short.",
    },
  },
  required: [
    "company",
    "position",
    "location",
    "jobUrl",
    "salary",
    "sourcePlatform",
    "status",
    "appliedAt",
    "notes",
  ],
  propertyOrdering: [
    "company",
    "position",
    "location",
    "jobUrl",
    "salary",
    "sourcePlatform",
    "status",
    "appliedAt",
    "notes",
  ],
};

export async function parseJobDump(text: string): Promise<ExtractedJobApplication> {
  const response = await gemini.models.generateContent({
    model: AI_DUMP_MODEL,
    contents: `Extract the job application details from this text (an email, job posting, or note about a job application):\n\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error("The AI did not return a structured result. Try again.");
  }

  return ExtractedJobApplicationSchema.parse(JSON.parse(response.text));
}
