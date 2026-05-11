## Changes to `src/pages/Devotional.tsx`

1. **Remove the italic teaser card** (lines ~354–359) — the `dayContent.theme` block under the title that duplicates the opening of the Context paragraph.

2. **Convert the Context section into a collapsible drawer** styled exactly like `StudyNotesDrawer`:
   - Same toggle button: `BookOpen` icon + uppercase serif label "Open Context", `ChevronDown` that rotates 180° when open.
   - Same border / `bg-[hsl(var(--card-deep))]` collapsed style; rounded-b-xl when closed, rounded-none when open.
   - Same expanded panel: rounded-b-xl border, small uppercase eyebrow ("Context · {chapter}"), then the commentary body in `font-serif text-[12px] text-muted-foreground` line-height 1.7.
   - Same animated `max-height/opacity` transition.
   - Default state: **closed** (matches Study Notes behavior). Resets to closed when the day changes.

3. **Stacking order under Scripture:**
   1. Context drawer (new)
   2. Study Notes drawer (existing, unchanged)

## Implementation note

Inline the drawer directly in `Devotional.tsx` using local state (no new component file needed — it's a single instance and avoids prop drilling for the commentary string). Reuse the same Tailwind classes from `StudyNotesDrawer.tsx` so the two drawers look visually identical and stack cleanly.

No DB, no schema, no new dependencies.
