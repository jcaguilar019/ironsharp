-- Hand-written (drizzle-kit generate is blocked on an unrelated rename prompt).
--
-- "Team only" — a plan that exists but is not ready for the congregation yet.
-- Hidden from every browse surface for non-admins and un-startable by them,
-- while anyone already reading it keeps it to the end. Flip the flag off when
-- the plan is ready and it appears for everyone; no deploy needed.
--
-- Nothing is flagged on the way in: the six pre-July-30 themed plans this was
-- first written for were deleted outright on 2026-08-24 (their writing is kept
-- at apps/server/archive/themed-plans-2026-08-24.json). The column is here for
-- the themed plans that get written next — draft them live, keep them off the
-- shelf until they're good.
--
-- No index: the whole table is a couple dozen rows and every browse query
-- already rides idx_plans_browse.
ALTER TABLE "devotional_plans"
  ADD COLUMN IF NOT EXISTS "admin_only" boolean NOT NULL DEFAULT false;
