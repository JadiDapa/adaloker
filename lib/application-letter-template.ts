import { format } from "date-fns";

/** Substitutes `{{date}}`/`{{company}}`/`{{position}}` placeholders in a user-written
 * letter template. Every occurrence is replaced (e.g. the company name often appears
 * both in the address block and in the body). */
export function renderLetterTemplate(
  template: string,
  values: { date: Date; companyName: string; position: string },
) {
  return template
    .replaceAll("{{date}}", format(values.date, "d MMMM yyyy"))
    .replaceAll("{{company}}", values.companyName)
    .replaceAll("{{position}}", values.position);
}
