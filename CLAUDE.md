# IronSharp

A Bible devotional app for a local church. Expo/React Native app in
`apps/mobile`, Hono + Drizzle + Neon Postgres API in `apps/server`.

Juan (`jcaguilar019`) owns the product and the devotional writing. Josiah
(`josiahturnq`) handles builds, deploys and anything native. Juan is not a
developer — explain by what a user would see, not by how the code works.

## Read this first

**`docs/for-josiah.md` is the live task list.** It holds everything that can't
ship over the air or needs a decision. Start there before proposing work.

**As of 2026-09-07, production is roughly a month stale.** Railway stopped
picking up pushes to `main`; five commits have never deployed. Check with:

    https://ironsharp-production.up.railway.app/health

`{"ok":true}` alone means the old build is still running. If it also reports a
`commit` and `startedAt`, the deploy landed. Until that's fixed, code changes
reach nobody — though database changes are unaffected and go live immediately.

## Things that will bite you

- **`DATABASE_URL` points at PRODUCTION Neon.** There is no staging database.
  Every query you run is against real data. **Always ask before writing.**
- **`npm run db:generate` is broken** — it stalls on an interactive rename
  prompt. Migrations in `apps/server/drizzle/` are hand-written and additive.
  Apply them deliberately; nothing runs them automatically.
- **Devotional content lives in the database, not in the repo.** Plans and their
  days are rows. Changing content means SQL, not a deploy — which is why plan
  changes go live while code changes sit waiting.
- **Two things named "family" are unrelated.** The `family` membership *tier*
  (a paid plan, still live) and the `family` group *type* (retired 2026-08-25,
  rows migrated to `small-group`). Don't conflate them.

## The shapes worth knowing

- **Group type means size** — `apps/server/src/lib/group-types.ts` is the single
  ladder: one-on-one 2, small 5, medium 10, large 30, church unbounded. Groups
  are promoted up it as they grow and never demoted. Mirrored in
  `apps/mobile/src/lib/groupTypes.ts`; keep the two in sync.
- **`admin_only` on a plan** hides it from everyone but the team, so plans can be
  drafted in production. Flipping it off releases the plan with no deploy.
- **Devotional writing has rules.** `docs/readthrough-questions.md` covers
  read-through questions. Passage fidelity outranks every formatting rule — never
  make the text say something it doesn't.

## Commands

    cd apps/server && npm test          # tsc + node --test (27 tests)
    cd apps/mobile && npx tsc --noEmit  # app typecheck

Run both before committing. There is no CI.
