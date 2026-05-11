## Goals

1. Make the personal devotional **actually functional** by wiring scripture to a free Bible API.
2. Declutter the Devotionals hub and Groups page.
3. Keep Community / Discipler / Family / Forge as visible-but-static placeholder cards, with the user's **Personal Plan pinned at the top** and the rest reorderable.

---

## 1. Free Bible translations (functional scripture)

Use **bible-api.com** (free, no key, CORS-enabled). Supports KJV, WEB, ASV, BBE, plus a few others. NIV/ESV/NLT are paywalled, so the translation dropdown will be trimmed to the free set:

- KJV (default)
- WEB (World English Bible — modern readable)
- ASV
- BBE (Bible in Basic English)

In `Devotional.tsx`:
- When `dayContent.chapter` loads (e.g. "Proverbs 27"), fetch `https://bible-api.com/proverbs+27?translation=kjv` and render the verses in a new "Scripture" card above the Context section.
- Refetch when translation changes.
- Show loading + graceful error state.
- Note above the dropdown: "Free public-domain translations."

## 2. Declutter Devotionals hub (`DevotionalHub.tsx`)

Current: 4 equally-weighted card blocks, each with accent bar, streak, progress, tagline, and full-width button — visually heavy.

New layout:
- **Personal Plan card (hero, top, prominent):** larger, full design treatment — title, today's chapter, day X/Y, progress bar, primary "Continue Reading" button. Pulls from `user_plan_progress` (same query as Home).
- **Other plans (compact rows):** Community Plan, Me & My Discipler, Me & My Family, The Forge. Each is a slim row: small accent dot, name, subtitle ("Day 5 of 7" placeholder), tap opens a small toast "Coming soon — this is a preview." No streak chips, no progress bars, no big tagline, no full-width buttons.
- Remove the "4.2K completed today / Marcus finished / 2 of 4 done" example taglines.
- Add a subtle **drag handle** on the four non-personal rows (using `@dnd-kit/core` already common, or a lighter `react-beautiful-dnd`-free approach with HTML5 drag). Personal Plan is fixed at top and not draggable.
- Persist order in `localStorage` (`ironsharp.devotional_order`) — no DB schema change needed since these are placeholders.

If no active personal plan exists, the hero card shows a "Choose a plan" CTA linking to `/plans`.

## 3. Declutter Groups page (`Groups.tsx`)

Same philosophy:
- Collapse each group card to a compact row by default: accent dot, name, subtitle ("Family · Psalm 23"), chevron.
- Remove the always-visible avatars, progress bar, streak, "Open Devotional" button, and "Start a New Group" dashed CTA from the default view.
- Tapping a row expands inline to show member list + Invite/Settings buttons (reuse existing expanded panel code).
- Keep "Start a New Group" but move it to a small text link at the bottom rather than a large dashed block.

## 4. Files touched

- `src/components/devotional/DevotionalHub.tsx` — rewrite layout (hero + compact rows + reorder).
- `src/pages/Devotional.tsx` — add Scripture fetch from bible-api.com, trim translation list to free options.
- `src/pages/Groups.tsx` — collapse default row, slim footer CTA.

No database migrations. No new dependencies (drag handled with a tiny native-drag implementation; falls back to up/down arrow buttons if needed).

---

## Open question

For the four non-personal cards on the Devotionals hub — should tapping them do **nothing** (just show "Coming soon"), or open a read-only mock view? You said "not necessarily have them be functioning," so I'm defaulting to a toast + no navigation. Let me know if you'd prefer otherwise after you see it.
