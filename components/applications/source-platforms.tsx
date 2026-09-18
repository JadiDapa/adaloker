/** Starter suggestions for the "Source" field — shown via a native <datalist>, so
 * typing anything else (a new platform, a referral, etc.) works just as well; this
 * list is just autocomplete, not a fixed set. */
export const SOURCE_PLATFORM_SUGGESTIONS = [
  "LinkedIn",
  "Glints",
  "Disnaker",
  "JobStreet",
  "Indeed",
  "Kalibrr",
  "Company website",
  "Referral",
];

export const SOURCE_PLATFORM_DATALIST_ID = "source-platform-suggestions";

export function SourcePlatformDatalist() {
  return (
    <datalist id={SOURCE_PLATFORM_DATALIST_ID}>
      {SOURCE_PLATFORM_SUGGESTIONS.map((s) => (
        <option key={s} value={s} />
      ))}
    </datalist>
  );
}
