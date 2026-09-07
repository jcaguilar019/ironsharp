# For Josiah

Things that can't ship over the air, or need Josiah's call. One line each.

- ~~Rewrite the 63 themed devotional days.~~ **Dropped 2026-08-24 — the six plans were deleted instead.** Juan's call: start fresh rather than rework drafts written before the July 30 rules. The library is books of the Bible only for now. Their writing is archived at `apps/server/archive/themed-plans-2026-08-24.json` (all 63 days, reflections and questions) if any of it is ever worth mining. The 33 reflections written in them were test entries — Juan's two accounts, Josiah, and one of Sarah's.

- **New themed plans get a soft launch.** Plans now carry an `admin_only` flag: on means the team sees it in the library and can read it, nobody else knows it exists, and it can't be started personally or assigned to a group. Turn it off when a plan is ready and it appears for everyone — no deploy. Set it in the database; there's no UI for it yet. Nothing is flagged right now.

- **START HERE — Railway has not deployed since early August.** Pushes to `main`
  are not being picked up. As of 2026-09-07 production is still serving a build
  from before 2026-08-06, and **five commits are waiting**: the Bible-order plan
  sorting, the themed-plan cleanup, the `admin_only` flag, the group size ladder,
  and the notification fix. Ruled out on our side — every commit is on
  `origin/main`, `main` is the only branch, the build passes and all 27 server
  tests pass locally.

  Needs someone in the Railway dashboard to check the service's deploy history
  and either redeploy or turn auto-deploy back on. Juan's ask (2026-09-07): get
  this deployed and clear whatever is wrong, so he can pick the app back up from
  a clean, working baseline.

  **How to tell whether it worked:** open
  `https://ironsharp-production.up.railway.app/health` in any browser.
  - `{"ok":true}` alone → still the old build; the deploy did not run.
  - `{"ok":true,"commit":"...","branch":"main","startedAt":"..."}` → it landed,
    and `commit` says which one. Compare it to the newest hash on `main`.

  `startedAt` moves on every redeploy even when the commit doesn't, which
  separates "Railway ignored the push" from "Railway redeployed and was already
  current."

  Note: database changes were never blocked by this, so the deleted themed plans
  and the regrouped group types are already live. Only code-side changes are
  waiting.

- **Verse numbers drift after a gap in the stored text.** In the KJV rows, Matthew 2, 22 and 26 and Mark 4, 7 and 8 each hold one fewer verse than a standard KJV, and each still ends on the correct final verse, so the missing verse is somewhere in the middle. The reader numbers verses by counting positions in the array, so after any gap every verse after it is displayed under the wrong number. Juan notes he has temporarily removed NLT and some other translations, and that the missing verses may or may not be present in those, so checking a second translation is the fastest way to find out whether this is a KJV import problem or something wider. Found 2026-08-06 while validating read-through passage references; full scope unknown without checking all 1,189 chapters against a reference.
- **Crash reporting (Sentry).** When a page breaks on someone's phone, nothing tells us — the error goes to a developer console nobody is attached to. Native package, so it needs a build. Deferred 2026-08-06.
- **Photo picker packages — FIXED in code 2026-08-06, needs a build to confirm.** The root list was still asking for the old `expo-image-picker` / `expo-image-manipulator` while the mobile list had the current ones, so both versions sat on disk — the same two-copies setup that caused the Completed Plans crash. Stale entries removed, lockfile re-synced, one version of each remains. **Josiah: install from the lockfile on a clean tree before the next build** — the duplicate only ever existed on a build machine last time.
- **Sign-in package was unpinned.** `@neondatabase/auth` was set to `latest` in the mobile list, so two machines installing a week apart could get different versions of a beta auth SDK. Pinned to `0.3.0-beta` in both lists 2026-08-06 (matching what was already installed and locked). Nothing to do unless you want a newer one.
