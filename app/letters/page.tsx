import { requireAccount } from "@/lib/clerk-session";
import { PersonalProfileService } from "@/servers/services/personal-profile.service";
import { AppShell } from "@/components/shared/AppShell";
import { ApplicationLetterCard } from "@/components/profile/ApplicationLetterCard";
import { listApplicationLetters } from "@/app/action/application-letter.action";

export default async function LettersPage() {
  const account = await requireAccount();
  const [profile, letters] = await Promise.all([
    PersonalProfileService.getByAccountId(account.id),
    listApplicationLetters(),
  ]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Application letters</h1>
        <p className="text-muted-foreground text-sm">
          Generate a cover letter PDF from your saved template. Letters are kept for 7 days,
          then automatically deleted.
        </p>
      </div>
      <ApplicationLetterCard letterTemplate={profile?.letterTemplate ?? null} letters={letters} />
    </AppShell>
  );
}
