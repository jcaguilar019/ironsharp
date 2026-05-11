## Goal

Restyle the pinned **Completed** tile on `/plans` to match the existing category tiles (image card with gradient overlay, top-right badge, bottom title), but keep it pinned at the top and full-width so it still reads as a system tile, not a category.

## Changes — `src/pages/Plans.tsx`

Replace the current bordered icon row with a full-width image tile using the same visual language as the category cards:

- **Container:** full-width `rounded-2xl` button, `aspectRatio: "16/9"` (shorter than category tiles so it doesn't dominate the page).
- **Background image:** new asset `src/assets/plans/completed.jpg` (generated) — a quiet, finished-feeling photo (open Bible with a ribbon marker, soft warm light, neutral palette so it works in all 5 themes).
- **Gradient overlay:** identical to category tiles — `bg-gradient-to-t from-black/80 via-black/30 to-transparent`.
- **Top-right badge:** same chip style as category tiles, label `"{N} Done"` when count > 0, `"Empty"` when count is 0.
- **Bottom-left text:** title "Completed" (font-serif, uppercase, white) + subtitle "Tap to revisit" / "Nothing yet" (white/70).
- **Disabled state:** when `completedCount === 0`, button is non-clickable and slightly dimmed (opacity-70).
- **Behavior:** unchanged — clicking navigates to `/plans/completed`. Still pinned above the 2-col category grid with `mb-3`.

## Files touched

- `src/pages/Plans.tsx` — swap the tile markup.
- `src/assets/plans/completed.jpg` — new generated image (matches the look/feel of the other category photos in `src/assets/plans/`).

No DB or routing changes.
