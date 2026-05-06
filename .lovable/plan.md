## Add Personal Devotional Card to Home Screen

The existing "Today's Devotional Card" on the Home screen currently points to the group/plan-based Devotional Hub. The user wants a separate **Personal Devotional** card — the user's own time with God, independent of any group — placed directly above Group Progress.

### Changes

**`src/pages/Home.tsx`**
- Add a new "My Devotional" card between the existing Today's Devotional card and Group Progress.
- The card will have its own distinct feel — a personal, quieter tone:
  - A subtle icon (e.g., `Heart` or `Sun`) to differentiate from the group-linked card above.
  - Title like "Personal Devotional" or "My Time with God."
  - A short prompt or scripture snippet and a "Begin Reading" action link.
  - Tapping navigates to a personal devotional reading flow (for now, can route to a placeholder or reuse the existing reading view with a personal context flag).
- Positioned right above the "Group Progress" section.

### Layout order on Home screen (after change)
1. Greeting + streak
2. Today's Devotional (group plan card — existing)
3. **Personal Devotional (new)**
4. Group Progress
5. Daily Quote
6. Community button
