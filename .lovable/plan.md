## Goal
Wipe everything: all 3 login accounts and every row of user-generated data, leaving only the public devotional content (plans, days, study notes). This cannot be undone.

## What gets deleted
- All login accounts (auth users) — 3
- Profiles (9 rows)
- Groups (3) and group memberships
- Devotional submissions and reactions
- User plan progress
- Disciple relationships and discipler notes

## What stays
- `devotional_plans`, `devotional_days`, `study_notes` (public content, no user data)

## How
Run a single data-clearing operation that empties all user-data tables, then removes the auth login accounts. Order matters so nothing is left orphaned:

```text
1. submission_reactions
2. discipler_notes
3. disciple_relationships
4. devotional_submissions
5. user_plan_progress
6. group_members
7. groups
8. profiles
9. auth users (login accounts)
```

After this, the app will have zero users; anyone can sign up fresh and the `handle_new_user` trigger recreates their profile automatically.

## Note
Once you approve and I switch to build mode, I'll execute the deletions. There is no recovery after this runs.