# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # start dev server
npm run build      # production build
npm run lint       # run ESLint

npm run db:migrate   # prisma migrate dev — create and apply migration
npm run db:generate  # regenerate client after schema changes
npm run db:studio    # open DB browser
```

## Architecture

Adaloker — a job-application tracker used by a friend group. Each group is a "server"
(join by invite code) with a **shared board**: every member sees every application added
to that group, not just their own. Personal profile data (CV-style info) is separate and
private per account.

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL,
Clerk (`@clerk/nextjs`) for self-serve auth, TanStack Query, shadcn/ui (radix base,
`maia` style), Google Gen AI SDK (`@google/genai`, Gemini) for the "AI dump" feature.

### Route groups

- `app/(auth)/sign-in|sign-up/[[...x]]/` — Clerk's own `<SignIn>`/`<SignUp>` components
  (self-serve sign-up, unlike admin-created accounts in other apps built off this template)
- `app/page.tsx` — `requireAccount()` then redirect to `/groups`
- `app/groups/page.tsx` — list of groups the account belongs to; create/join dialogs
- `app/groups/[groupId]/layout.tsx` — guards membership, 404s unknown groups
- `app/groups/[groupId]/page.tsx` — the shared job-application board
- `app/groups/[groupId]/settings/page.tsx` — invite code (owner can regenerate), member list
- `app/join/[code]/page.tsx` — invite-link landing page: sign in if needed, then join and
  redirect into the group
- `app/profile/page.tsx` — Personal Data Hold (CV-style profile), private per account
- `app/action/` — Next.js Server Actions (all files `"use server"`)
- `app/api/webhooks/clerk/` — syncs Clerk identity → local `Account` table

`proxy.ts` (Next 16's replacement for `middleware.ts`) runs `clerkMiddleware()`: any route
other than `/sign-in`/`/sign-up` requires a session.

### Server-side layers

```
app/action/          ← Server Actions: validate input → call Service → revalidatePath
servers/validators/  ← Zod schemas + DTO types
servers/services/    ← DB access via Prisma
lib/prisma.ts        ← singleton PrismaClient (PrismaPg adapter)
lib/ai/               ← Gemini structured-output calls that turn free text into structured DTOs
```

Actions import validators, services, and `lib/ai/*`. Services import from `lib/prisma`.
Nothing else should touch Prisma directly.

### Prisma

The client is generated to `generated/prisma/` (not the default location). Always import
from `@/generated/prisma`, not from `@prisma/client`:

```ts
import { ApplicationStatus, GroupRole } from "@/generated/prisma";
import prisma from "@/lib/prisma";
```

Run `npm run db:generate` after any schema change. Prisma CLI is pinned to v7 to match
`@prisma/client`/`@prisma/adapter-pg` — don't let it drift to v8 without bumping all three
together.

### Domain models

- **Account** — identity synced from Clerk via webhook (`user.created`/`updated`).
  `clerkId` is the source of truth. `user.deleted` is intentionally NOT handled (see the
  comment in `app/api/webhooks/clerk/route.ts`) — deleting the row would break shared
  application history or hit an FK restrict, so a deleted Clerk account just leaves an
  orphaned local row.
- **Group** — a shared board. `inviteCode` is an 8-char code (see `lib/invite-code.ts`),
  regenerable by the owner to invalidate the old one.
- **GroupMember** — `Account` ↔ `Group` with a `role` (`OWNER`/`MEMBER`). The group creator
  is auto-OWNER (`GroupService.create`).
- **JobApplication** — belongs to a `Group`, visible to every member regardless of who
  added it (`createdBy` is attribution, not an access filter). `source` +`rawDumpText`
  record whether/what was pasted for the AI dump feature. `notes` is HTML from the
  Tiptap rich text editor.
  `number` is a permanent per-group sequence (`@@unique([groupId, number])`, assigned
  max+1 in `JobApplicationService.create`) — the short "#12" the WhatsApp bot uses
  instead of the cuid `id`.
- **ApplicationMemberStatus** — one member's own status + applied date for a
  `JobApplication` (`@@unique([applicationId, accountId])`). Status/applied date are
  **per member**, not shared on the posting — everyone in the group tracks their own
  progress on the same shared job entry. A member with no row is treated as `WISHLIST`
  at the application layer (`JobApplicationService`/`ApplicationsTable`), so rows are
  only created lazily via upsert when someone actually changes their status. "Applied
  users" (shown in the UI) is derived as every member whose status != `WISHLIST`.
- **PersonalProfile** — one-to-one with `Account`, private. Every section
  (`personalData`/`contactInfo`/`educations`/`workExperience`/`organizations`/`skills`/
  `languages`) is a free-form JSON list the user can add/remove/rename fields in — there's
  no fixed set of columns per user. See `servers/validators/personal-profile.validator.ts`
  for the shapes and `lib/profile-defaults.ts` for the starter labels seeded into a brand
  new profile (defaults only — once a profile is saved, its stored JSON is used as-is).
  `ProfileDocument` holds arbitrary labeled file uploads (KTP, ijazah, transkrip, photo,
  etc.) — the label is free text chosen by the user, separate from the single dedicated
  `resumeUrl`/`resumeKey` resume slot.
- `Account.whatsappPhone` / `Group.whatsappGroupJid` — link identities to the WhatsApp
  bot (see "WhatsApp bot" below), unrelated to any "Phone number" field the user might
  keep under `PersonalProfile.contactInfo` (free-text CV data, never used by the bot).

### AI dump feature

`lib/gemini.ts` holds a singleton `GoogleGenAI` client and `AI_DUMP_MODEL`
(`gemini-3.5-flash-lite` — cheap and fast enough for structured extraction; this is a
shared API key paying for every user's dumps, so cost per call matters). `lib/ai/parse-job-dump.ts`
and `lib/ai/parse-profile-dump.ts` pass a typed `responseSchema` (`responseMimeType:
"application/json"`) so the response is always the expected JSON shape, then validate it
again with the matching Zod schema before it's ever shown to the user — the UI always
shows the extraction as an editable, reviewable form before saving, never saves straight
from the model.

### WhatsApp bot

`whatsapp-bot/index.ts` is a standalone script (Baileys, not part of the Next.js app —
run separately with `npm run bot:whatsapp`). It reuses this same codebase's
`AccountService`/`GroupService`/`JobApplicationService`/`lib/ai/parse-job-dump.ts` directly
(imported via the `@/*` path alias, which `tsx` resolves from `tsconfig.json`) instead of
going through the `app/action/*` server actions, since those call `next/cache` APIs that
only work inside a Next.js request.

Commands (sent in a linked WhatsApp group chat):
- `/id` — replies with the group's JID, for pasting into Group settings. Works even if
  the group isn't linked yet or the sender hasn't linked their number.
- `/loker <free text>` — runs the free text through `parseJobDump` and creates a
  `JobApplication` in the linked group's board (source `AI_DUMP`). If the text is just a
  single http(s) link, it's scraped first with `lib/fetch-page-text.ts` (same as the web
  app's URL tab) and saved with source `URL_DUMP`, falling back to the link as `jobUrl`.
- `/me` — the sender's own summary of the linked group's board:
  `JobApplicationService.getMemberOverview` returns total applications, how many the
  sender has applied to (any non-WISHLIST status, same as the web "Applied" filter), how many are
  still WISHLIST (a member with no `ApplicationMemberStatus` row defaults to WISHLIST,
  same convention as the web app), the most recently added application, and the nearest
  upcoming interview. "Nearest wawancara" reuses `ApplicationMemberStatus.appliedAt` —
  despite the name, the web UI (`ApplicationDetailSheet`) lets a member set that date for
  *any* status, not just APPLIED, so setting it while status is INTERVIEW is how an
  interview date gets recorded; there's no separate `interviewAt` field.
- `/list [n|all]` — the linked group's board newest first as "#number Company - Position"
  lines (default 10, `JobApplicationService.listForMember`). Ones the sender has applied
  to (non-WISHLIST, same convention as `/me`) get a ✅ and their status; the rest show
  their `jobUrl`.
- `/set <#> <status>` — changes the sender's own `ApplicationMemberStatus` on loker `#`
  (see `STATUS_ALIASES` for accepted words, e.g. apply/applied/lamar → APPLIED). Moving
  off WISHLIST stamps today as `appliedAt` if unset, same as the web status dropdown.
- `/id`/`/me`/`/list`/`/set`/`/loker` all require the group to be linked; `/me`, `/list`, `/set` and `/loker` additionally
  require the sender's number to be linked to an Account that's a member of that group.

Matching a WA message to an app Account/Group is entirely phone-number/JID based, both
opt-in and self-served — no new auth system:
- `Account.whatsappPhone` (unique, E.164) — set by the user themself on `/profile`
  (`WhatsappLinkCard`); must match the number they message the group from.
- `Group.whatsappGroupJid` (unique, `...@g.us`) — set by the group owner on
  `/groups/[groupId]/settings` (`WhatsappGroupLinkCard`); send `/id` in the WA group to
  get its JID.

A WA group's `participant` JID is sometimes an opaque `@lid` instead of a phone number
(WhatsApp's LID privacy addressing) — in that case the real number is in
`msg.key.participantPn`, not `participant` itself (see `resolveSenderPhoneJid` in
whatsapp-bot/index.ts). Session credentials live in `whatsapp-bot/auth/` (gitignored,
created on first QR scan).

### Auth

Clerk handles sign-up/sign-in/session entirely. `lib/clerk-session.ts` is the DAL:
`getCurrentAccount()` / `requireAccount()`, both backed by a DB lookup (not just the Clerk
session) via `AccountService.getByClerkId`.

### Components

- `components/ui/` — shadcn/ui primitives (radix-ui based); don't hand-edit, use the
  `shadcn` CLI
- `components/shared/` — `AppShell` (nav shell used by every authenticated page),
  `ToggleTheme`
- `components/groups/` — `GroupDialogs` (create/join tabs), `InviteCodeCard`,
  `WhatsappGroupLinkCard`
- `components/applications/` — `AddApplicationDialog` (manual form + AI dump tab),
  `ApplicationsTable`, `StatusBadge`
- `components/profile/` — `ProfileForm` (AI dump card + manual form with
  `useFieldArray` for experience/education), `WhatsappLinkCard`

### Styling

Tailwind v4 (PostCSS plugin), theme tokens in `app/globals.css` (tweakcn "Bubblegum"
theme — oklch color tokens, `.dark` class variant, custom shadow tokens). Use `cn()` from
`lib/utils.ts` for conditional classes. Fonts: Poppins (sans), Lora (serif), Fira Code
(mono), loaded via `next/font/google` in `app/layout.tsx`.
