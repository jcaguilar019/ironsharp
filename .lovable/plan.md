
## What we're building

Mock/preview screens for the Family Plan & Youth Mode features from the doc, plus four UX adjustments you requested.

## Changes

### 1. Family Plan mock screens (preview-only, no backend)

Create these new pages with static mock data:

- **Family Plan Onboarding** (`/onboarding/family`) — explains what's included, mock setup flow for parent + child profiles
- **Add Child Profile** (`/family/add-child`) — form UI for child name, grade, photo placeholder
- **Family Dashboard** (`/family`) — household view with family member avatars, completion checkmarks, family streak
- **Youth Mode Home** (`/youth/home`) — same layout as adult Home but with youth-specific devotional card and restricted nav
- **Youth Mode Devotional** (`/youth/devotional`) — same format, youth-calibrated sample questions
- **Parent Dashboard** (`/family/parent-dashboard`) — overview of child profiles, submissions, streaks, groups

All routes added to `App.tsx`. No database changes — purely static UI for presentation.

### 2. Move Themes into Settings, replace bottom nav tab with Family

- Remove the "Themes" tab from `BottomNav.tsx`
- Add a "Family" tab (with a `Heart` or `Users` icon) pointing to `/family`
- Move the Theme Picker link into `SettingsPage.tsx` as a button/section
- Keep the existing Themes button on the Profile page as well

### 3. Show login screen before entering the app

- Turn off the auto-redirect in `Splash.tsx` — stop the 1.5s timer that skips straight to `/home`
- Keep the splash screen with "Sign Up" and "Log In" buttons visible
- "Log In" goes to `/login`, which shows the login form (non-functional in demo mode)
- Add a "Continue as Guest" or "Preview App" button on the login screen that navigates to `/home` without credentials
- This way you can show people the login screen first, then tap through to the app

### 4. Brighten Vesper theme readability

In `src/index.css`, adjust the Vesper (`:root`) color variables:

- **Foreground text**: Bump from `35 28% 89%` to `35 30% 94%` — brighter warm white
- **Muted foreground** (verses, secondary text): Bump from `210 12% 55%` to `210 14% 68%` — noticeably lighter
- **Bottom nav inactive icons** use `text-muted-foreground` — the above change brightens them automatically
- **Primary accent** (gold buttons/links): Slight bump from `40 36% 60%` to `40 40% 65%` for better contrast

### Files to create
- `src/pages/FamilyDashboard.tsx`
- `src/pages/FamilyOnboarding.tsx`
- `src/pages/AddChildProfile.tsx`
- `src/pages/ParentDashboard.tsx`
- `src/pages/YouthHome.tsx`
- `src/pages/YouthDevotional.tsx`

### Files to edit
- `src/App.tsx` — add new routes
- `src/components/BottomNav.tsx` — swap Themes for Family
- `src/pages/SettingsPage.tsx` — add Themes section
- `src/pages/Splash.tsx` — remove auto-redirect
- `src/pages/Login.tsx` — add "Preview App" button
- `src/index.css` — brighten Vesper color values
