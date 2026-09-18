import { requireAccount } from "@/lib/clerk-session";
import { PersonalProfileService } from "@/servers/services/personal-profile.service";
import { AppShell } from "@/components/shared/AppShell";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeCard } from "@/components/profile/ResumeCard";
import { DocumentsCard } from "@/components/profile/DocumentsCard";
import { WhatsappLinkCard } from "@/components/profile/WhatsappLinkCard";
import { emptyProfileForm } from "@/lib/profile-defaults";
import type { PersonalProfileFormDTO } from "@/servers/validators/personal-profile.validator";

export default async function ProfilePage() {
  const account = await requireAccount();
  const profile = await PersonalProfileService.getByAccountId(account.id);

  const defaultValues: PersonalProfileFormDTO = profile
    ? {
        personalData: (profile.personalData as PersonalProfileFormDTO["personalData"]) ?? [],
        contactInfo: (profile.contactInfo as PersonalProfileFormDTO["contactInfo"]) ?? [],
        educations: (profile.educations as PersonalProfileFormDTO["educations"]) ?? [],
        workExperience: (profile.workExperience as PersonalProfileFormDTO["workExperience"]) ?? [],
        organizations: (profile.organizations as PersonalProfileFormDTO["organizations"]) ?? [],
        skills: (profile.skills as PersonalProfileFormDTO["skills"]) ?? [],
        languages: (profile.languages as PersonalProfileFormDTO["languages"]) ?? [],
      }
    : emptyProfileForm();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-muted-foreground text-sm">
          Private to you — used to prefill applications and keep your CV data in one place.
        </p>
      </div>
      <div className="mb-6">
        <ResumeCard resumeUrl={profile?.resumeUrl ?? null} resumeName={profile?.resumeName ?? null} />
      </div>
      <div className="mb-6">
        <DocumentsCard documents={profile?.documents ?? []} />
      </div>
      <div className="mb-6">
        <WhatsappLinkCard whatsappPhone={account.whatsappPhone} />
      </div>
      <ProfileForm defaultValues={defaultValues} />
    </AppShell>
  );
}
