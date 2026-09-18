import { z } from "zod";

/** The user's own reusable cover letter text, with `{{date}}`/`{{company}}`/
 * `{{position}}` placeholders substituted each time a letter is generated. */
export const LetterTemplateSchema = z.object({
  template: z.string().trim().min(1, "Write your letter template first").max(20000),
});
export type LetterTemplateDTO = z.infer<typeof LetterTemplateSchema>;

/** Inputs for generating one ApplicationLetter from the saved template. */
export const GenerateLetterSchema = z.object({
  date: z.string().trim().min(1, "Date is required"),
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  position: z.string().trim().min(1, "Position is required").max(200),
});
export type GenerateLetterDTO = z.infer<typeof GenerateLetterSchema>;
