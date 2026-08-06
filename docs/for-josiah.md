# For Josiah

Things that can't ship over the air, or need Josiah's call. One line each.

- **Rewrite the 63 themed devotional days.** Six plans written before the July 30 rules: Formed (14), The Revelation You Missed (7), Faith That Shows Up (7), You Were Chosen Before You Knew You Were Lost (14), Built Together (7), When It's Beautiful and Breaking You (14). The reflections stay as they are; the pass is swapping the questions to the current craft, removing 544 em dashes, and running the truth check. Parked 2026-08-06 as too long to do now. Worked reference is James 1:2-8 Day 1.

- **Crash reporting (Sentry).** When a page breaks on someone's phone, nothing tells us — the error goes to a developer console nobody is attached to. Native package, so it needs a build. Deferred 2026-08-06.
- **Photo picker packages — FIXED in code 2026-08-06, needs a build to confirm.** The root list was still asking for the old `expo-image-picker` / `expo-image-manipulator` while the mobile list had the current ones, so both versions sat on disk — the same two-copies setup that caused the Completed Plans crash. Stale entries removed, lockfile re-synced, one version of each remains. **Josiah: install from the lockfile on a clean tree before the next build** — the duplicate only ever existed on a build machine last time.
- **Sign-in package was unpinned.** `@neondatabase/auth` was set to `latest` in the mobile list, so two machines installing a week apart could get different versions of a beta auth SDK. Pinned to `0.3.0-beta` in both lists 2026-08-06 (matching what was already installed and locked). Nothing to do unless you want a newer one.
