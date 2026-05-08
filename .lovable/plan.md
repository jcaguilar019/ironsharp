
## Problem

Tapping a category tile (e.g. Men's Devotional) on the Plans page jumps straight into the devotional reading view. You want an intermediate listing page showing all plans in that category with title and short description.

## Plan

### 1. Create a new `PlanList` page (`src/pages/PlanList.tsx`)

- Route: `/plans/:category`
- Fetches all `devotional_plans` where `category` matches the URL param
- Displays each plan as a card/row with:
  - Plan title (e.g. "Being a Man")
  - 1-2 sentence description from `devotional_plans.description`
  - Duration badge (e.g. "7 Days")
  - Start / Continue button
- Tapping a plan navigates to `/devotional?plan=<plan_id>`
- Back button returns to `/plans`
- Uses the app's existing theme tokens and serif/sans font pairing

### 2. Update `Plans.tsx`

- Change tile `onClick` to navigate to `/plans/${category}` instead of `/devotional?category=...`

### 3. Update `App.tsx`

- Add route: `<Route path="/plans/:category" element={<PlanList />} />`

### 4. Ensure plan descriptions exist in the database

- Check existing `devotional_plans` rows for `description` values; if null, run a migration to add short descriptions to the 3 seeded plans ("Being a Man", "Being a Husband", "Joy That Doesn't Make Sense").

No new tables or schema changes needed — just the existing `description` column on `devotional_plans`.
