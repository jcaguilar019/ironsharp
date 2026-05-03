
# IronSharp — Daily Devotional & Accountability App

A faith-based web app where friends, discipleship pairs, and small groups do the same daily Bible devotional together, compare notes after everyone submits, and hold each other accountable with streaks and notifications.

---

## Phase 1: Foundation (Theme System, Auth, Onboarding)

### Theme System
Set up the 5-theme system as the foundation — every component will read from the active theme. Themes: Parchment (default), Sage, Dusk, Slate, Vesper (dark). All colors from the brief's exact hex values, stored as CSS custom properties. Theme selection persisted to localStorage initially (moved to Supabase profile later).

### Design System
- Serif font (Playfair Display) for Scripture text, headings, and wordmark
- Rounded sans-serif (DM Sans) for UI labels and body text
- Lucide React icons throughout
- Soft shadows, generous whitespace, rounded corners, no harsh borders
- Mobile-optimized layout (440px viewport) with desktop support

### Auth Screens (Lovable Cloud — email/password + Google)
1. **Splash Screen** — IronSharp logo, tagline "Sharpen each other. Every day.", Sign Up / Log In buttons
2. **Sign Up** — email, password, confirm password, Google SSO button, link to Log In
3. **Log In** — email + password, Google SSO, Forgot Password link
4. **Email Verification** — "Check your inbox" waiting state, Resend button
5. **Forgot Password** — email input, send reset link, confirmation state
6. **Reset Password** — new password form (linked from email)

### Onboarding Flow
7. **Complete Your Profile** — display name, profile photo upload, home church (optional)
8. **Role Select** — choose Discipler / Disciple / Accountability Partner
9. **Plan Select** — scrollable list of devotional plans (seeded with sample data)
10. **Create or Join Group** — two options: create (name + invite code) or join (enter code)

---

## Phase 2: Core Devotional Experience

### Database Tables (Lovable Cloud)
- `profiles` — extends auth.users with name, avatar, church, role, theme_preference, preferred_translation
- `user_roles` — separate roles table for security
- `groups` — name, plan_id, creator_id, invite_code, cutoff_time
- `group_members` — group_id, user_id, role (discipler/disciple/partner)
- `devotional_plans` — title, description, total_days, scripture_book
- `devotional_days` — plan_id, day_number, passage_reference, commentary, reflection questions
- `submissions` — user_id, group_id, devotional_day_id, responses, prayer_text, submitted_at
- `reactions` — submission_id, reactor_user_id, reaction_type (amen/hit_me/fire)

### Screens
11. **Home Dashboard** — today's devotional card, group member avatars with completion checkmarks, personal + group streak counters, daily quote
12. **Today's Devotional** — translation picker (NIV, ESV, NLT, KJV, NKJV, CSB, MSG), full chapter text, contextual commentary, 2 reflection questions with text inputs, optional prayer/praise field, Submit button
13. **Waiting State** — shown post-submission before partners finish; who's done, who's pending, encouraging message
14. **Compare Notes** — unlocked when all partners submit; shows each member's responses with reaction buttons (🙏 Amen, ✨ That hit me, 🔥 Fire)

### Key Logic
- Spoiler-free: responses hidden until the viewing user has submitted
- Submission unlocks the Compare Notes view
- Personal and group streak tracking
- Translation preference saved per user (doesn't affect group)

### Sample Content
Seed 5–7 days of devotional content (Proverbs 27) with commentary and reflection questions per the brief's guidelines.

---

## Phase 3: Groups, Profile, Settings, Polish

15. **Group Screen** — group name, member list with roles, streaks, notification settings, shareable invite link
16. **Profile View** — avatar, name, church, streak, lifetime count, list of groups with roles
17. **Profile Edit** — photo picker, editable name/church/email, change password, Save/Cancel with unsaved-changes confirmation
18. **Settings** — notification toggles (partner done, morning reminder, nudge, group complete) with time pickers, privacy note, Log Out, Delete Account
19. **Devotional Plan Library** — browse/search plans, filter by length, topic, or Bible book
20. **Theme Picker** — dedicated bottom-nav tab with palette icon; each theme card shows mini phone mockup in that theme's colors, name, description, color swatches; active theme gets accent border + checkmark; tapping applies instantly

### Bottom Navigation Bar
- Home (house icon)
- Devotional (book icon)
- Groups (users icon)
- Themes (palette icon)
- Profile (user icon)

### Notification UI
- Toggle UI for each notification type with time picker (placeholder for V1 — actual push notifications are a post-prototype feature)

---

## Technical Details

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Lovable Cloud (Supabase) for auth, database, and storage
- **Auth**: Email/password + Google SSO via Lovable Cloud
- **Bible API**: Integration with a free Bible API (bolls.life or api.bible) for Scripture text in multiple translations
- **Theme engine**: CSS custom properties swapped at runtime, preference persisted to Supabase profile
- **Fonts**: Google Fonts — Playfair Display (serif) + DM Sans (sans-serif)
- **Icons**: lucide-react
- **RLS**: Row-level security on all tables; submissions visible only to group members
- **Read-aloud**: Web Speech API (SpeechSynthesis) for TTS with playback controls (play/pause, 15s rewind, speed control)
