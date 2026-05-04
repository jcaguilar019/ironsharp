## What changes

Remove the entire "Daily Check-In" section from `src/pages/Devotional.tsx` (lines 183-241), which includes:
- Mood emoji selector ("How are you feeling today?")
- Gratitude text area ("One thing you're grateful for")
- Accountability check-in text area

Also clean up the related state variables (`mood`, `gratitude`, `accountability`) and unused imports (`Smile`, `Heart`, `ShieldCheck`).

The Voice Memo section stays. Everything else on the page stays as-is.