/**
 * Standalone maintenance script -- deletes every ApplicationLetter (DB row + its
 * UploadThing PDF) whose 7-day retention window has passed, across all accounts.
 *
 * The app also purges a user's own expired letters lazily whenever they list/generate
 * one (see app/action/application-letter.action.ts), but that only fires on a visit.
 * Schedule this script (cron/Task Scheduler) to run daily so letters nobody revisits
 * still get cleaned up:
 *
 *   npm run cleanup:letters
 */
import { ApplicationLetterService } from "@/servers/services/application-letter.service";
import { utapi } from "@/lib/uploadthing";

async function main() {
  const expired = await ApplicationLetterService.listAllExpired();
  if (expired.length === 0) {
    console.log("No expired application letters to clean up.");
    return;
  }

  console.log(`Cleaning up ${expired.length} expired application letter(s)...`);

  await Promise.all(expired.map((letter) => utapi.deleteFiles(letter.pdfKey).catch(() => {})));
  await ApplicationLetterService.deleteMany(expired.map((letter) => letter.id));

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
