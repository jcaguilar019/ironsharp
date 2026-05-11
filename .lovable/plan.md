## Goal

Add a pinned **Completed** tile at the top of the Plans page so users can quickly jump to and re-read any devotional they've finished.

## Changes

### 1. `src/pages/Plans.tsx` — pin a Completed tile

- Above the existing 2-column category grid, render a single full-width "Completed" tile.
- Tile shows: title "Completed", subtitle = `{N} Plan{s}` (or "Nothing yet" when zero), book/check icon, themed background (no photo — uses `bg-card` + accent border so it visually reads as system, not a category).
- Always visible, even when count is 0 (in that case it's not clickable and shows "Nothing yet").
- Count loaded from `user_plan_progress` where `user_id = current user` and `completed_at IS NOT NULL`. Demo user UUID already supported by RLS.
- Clicking → `navigate("/plans/completed")`.

### 2. New page `src/pages/CompletedPlans.tsx`

- Route added in `src/App.tsx`: `<Route path="/plans/completed" element={<CompletedPlans />} />` (registered **before** `/plans/:category` so it isn't swallowed).
- Lists every completed plan for the user, newest first:
  - Query `user_plan_progress` (`plan_id, completed_at`) where `user_id = me` and `completed_at IS NOT NULL`, then join titles/total_days from `devotional_plans`.
  - Each row: plan title, total days, completion date ("Completed May 9"), chevron right.
- Tapping a row → `navigate("/plans/completed/:planId")`.
- Back button to `/plans`.

### 3. New page `src/pages/CompletedPlanReview.tsx` — read-only day list

- Route: `<Route path="/plans/completed/:planId" element={<CompletedPlanReview />} />`.
- Header: plan title + "Completed {date}".
- Lists Day 1 … Day N (from `devotional_days` for that plan), each row showing day number + chapter (e.g., "Day 3 · James 1"). Tapping a day → `navigate(\`/devotional?plan={planId}&day={n}&review=1\`)`.

### 4. `src/pages/Devotional.tsx` — review mode

- Read `review` and `day` from `useSearchParams`. When `review=1`:
  - Skip the today-lock / completion screen short-circuit; render the chapter normally with the requested `day` (override `current_day`).
  - Hide the reflection textareas, voice memo, and Submit button. Render a small "Review mode · read-only" badge instead.
  - Keep Scripture + Context drawer + Study Notes drawer fully visible and functional.
  - Back button returns to `/plans/completed/:planId`.

## Out of scope

- No DB schema changes (uses existing `user_plan_progress.completed_at` and `devotional_days`).
- No new way to mark complete; relies on existing flow.
- No edit/delete of past responses (review-only). A future pass can surface their saved reflections.

## Files touched

- `src/pages/Plans.tsx` (add pinned tile + count query)
- `src/pages/CompletedPlans.tsx` (new)
- `src/pages/CompletedPlanReview.tsx` (new)
- `src/pages/Devotional.tsx` (add `review=1` mode)
- `src/App.tsx` (register two new routes, ordered before `/plans/:category`)
