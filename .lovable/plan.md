# Help Center

You're right — the spec itself says "accessible from Settings → Help Center", so we'll house it there rather than as its own bottom-nav tab.

## What we'll build

1. **New page `src/pages/HelpCenter.tsx`** at route `/help`
   - Header: IronSharp wordmark, "Help Center" title, total article count, search bar
   - Category pills row (hidden during active search)
   - 8 collapsible section cards, each with an accordion of articles
   - "Still need help?" footer card with `mailto:support@ironsharp.app`
   - Real-time client-side search (filters across title + body)
   - All 8 sections with their accent colors, icons, and article counts per the spec

2. **Settings entry point** — add a "Help Center" row in `src/pages/SettingsPage.tsx` (under a new "Support" group, above Delete Account) that navigates to `/help`.

3. **Route registration** in `src/App.tsx`.

4. **Article content** — for v1, seed the 47 articles inline as a typed TS array (`src/data/helpArticles.ts`) grouped by section. Keeps it shippable without backend churn; we can migrate to a `help_articles` table later if you want editors to update copy without a deploy.

## Design / theme notes

The spec lists hardcoded hex values (parchment background, warm white cards, Georgia serif) that match the **Parchment** theme only. To stay consistent with the app's 5-theme system, I'll use semantic tokens (`bg-background`, `bg-card`, `border-border`, `text-foreground`, etc.) plus Playfair Display for headings and DM Sans for body — so the Help Center re-skins automatically with whichever theme the user has active. Section accent colors (baby blue, gold, sage, etc.) stay as fixed accents on the section icons/pills since they're identity colors for each topic.

## Out of scope

- Hosting at `help.ironsharp.app` (web-only, separate)
- Supabase `help_articles` table (deferred — flat data file for now)
- Support email auto-responder
- Writing all 47 final article bodies — I'll stub each with the questions from the spec and short placeholder answers you can edit; let me know if you'd rather I draft full answers for all 47.

## Question

Do you want me to **draft full answers for all 47 articles** now, or **stub them with the questions + short placeholders** so you can fill in voice-accurate answers yourself?
