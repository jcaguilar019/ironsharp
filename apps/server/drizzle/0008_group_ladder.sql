-- Hand-written (drizzle-kit generate is blocked on an unrelated rename prompt).
--
-- Group type now means SIZE. The ladder in src/lib/group-types.ts:
--   one-on-one (2) · small-group (5) · medium-group (10) · large-group (30) ·
--   community (unbounded, church staff only)
-- A group is promoted up it as it grows, and never demoted back down.
--
-- "family" is retired: it named a RELATIONSHIP while every other type named a
-- size, so it had no place on the ladder. Every family group on 2026-08-25 held
-- two people or fewer, which is small-group territory. Deliberately NOT mapped
-- to one-on-one — that type switches on the discipleship tools, and these
-- groups never had them.
UPDATE "groups"
   SET "group_type" = 'small-group',
       "updated_at" = now()
 WHERE "group_type" = 'family';

-- No column change: group_type is free text, and the app is the authority on
-- what's valid. Nothing to roll back beyond re-labelling these rows.
