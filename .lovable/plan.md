
## Overview

Reorganize the bottom navigation to 5 tabs and create a new Plans page that displays devotional plan categories in a 2-column image card grid (inspired by the WHOOP screenshot).

## Bottom Navigation Changes (`src/components/BottomNav.tsx`)

Update to 5 tabs in this order (left to right):
1. **Devotional** (BookOpen icon) — `/devotional`
2. **Groups** (Users icon) — `/groups`
3. **Home** (Home icon, center) — `/home`
4. **Plans** (Library icon) — `/plans`
5. **Profile** (User icon) — `/profile`

## New Plans Page (`src/pages/Plans.tsx`)

Create a new page with a 2-column grid of plan category cards. Each card features:
- A themed gradient/color background (placeholder for future thumbnails)
- Category label badge (e.g. "7 Day", "14 Day", "30 Day")
- Plan title in bold serif font
- Subtitle with plan count

Mock categories:
- Men's Devotional
- Women's Devotional
- Husbands & Fathers
- Wives & Mothers
- Family Devotional
- Marriage
- Youth
- New Believer

Layout styled after the reference screenshot: tall image-style cards in a `grid-cols-2` grid with rounded corners, overlay text, and duration/level badges.

## Devotional Hub Cleanup (`src/components/devotional/DevotionalHub.tsx`)

Remove the "Browse Plans" dashed button at the bottom since plans now have their own tab.

## Routing (`src/App.tsx`)

Add route: `/plans` → `Plans` component.

## Technical Details

- New file: `src/pages/Plans.tsx`
- Modified files: `src/components/BottomNav.tsx`, `src/components/devotional/DevotionalHub.tsx`, `src/App.tsx`
- Uses themed gradient backgrounds for cards since no real images exist yet
- Tapping a card is a placeholder (no-op or toast) for now
