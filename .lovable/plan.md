## Commute Mode — Hands-free Devotional

A full-screen, voice-guided devotional experience for driving/commuting. The app reads everything aloud (TTS), records spoken answers (STT), and submits — all without looking at the screen.

### 1. Entry Point — Play Button Dropdown

Replace the existing Headphones button on `Devotional.tsx` (line 378-380) with a **Play button + dropdown**:

- Tapping the play button **never plays immediately** — opens a small dropdown anchored above it
- Header: "AUDIO OPTIONS" (10px all-caps, tracking-wide, muted)
- **Option 1 — Listen Only**: headphones icon square, "Reads the devotional aloud" → starts TTS of full devotional inline
- **Option 2 — Commute Mode** (highlighted with `bluePale` bg): car icon square, "Hands-free — reads & records" → launches full-screen Commute Mode
- Tap outside closes dropdown

### 2. Commute Mode Full-screen Flow

New route `/devotional/commute?plan=X&day=Y` rendering `CommuteMode.tsx`. Linear step machine:

```text
intro → passage → commentary → q1_intro → q1_ready → q1_countdown → q1_record
      → q2_intro → q2_ready → q2_countdown → q2_record → done
```

- **Auto-speak steps** (intro/passage/commentary/q1_intro/q2_intro): TTS plays, advances automatically on `onend`
- **Ready steps**: large "I'm Ready" button → starts 3-2-1 countdown
- **Record steps**: starts STT, shows live transcript card, large "Stop" button → saves transcript → auto-advances after 1.5s
- **Done step**: TTS "Great work…" + large "Submit My Devotional" button → writes to DB and returns

### 3. Visual Design

- Full-screen dark canvas (theme bg, already dark in Vesper)
- Top bar: back arrow + "COMMUTE MODE" label + chapter ref + car icon
- 3px progress bar fills left → right across steps
- Centered 80x80 step indicator circle with contextual icon (headphones / mic / number / check)
- Step label all-caps below circle
- Question text (italic, centered) on question steps
- Transcription card (rgba white 0.08, rounded-2xl) during recording
- Large bottom action button on input-required steps
- Step dots at bottom: current elongates, past filled, future faint
- Accent color: baby blue `#89B4C9` — added as semantic token

### 4. Web TTS + STT (browser-native, free)

V1 uses browser-native APIs — no external cost, works in Lovable preview:

- **TTS**: `window.speechSynthesis` + `SpeechSynthesisUtterance` (rate 0.95, pitch 0.95)
- **STT**: `window.SpeechRecognition || window.webkitSpeechRecognition` (continuous + interimResults for live transcript)
- Spec mentions iOS/Android native APIs (V1) and Whisper (V2) — those are native-app concerns. For the Lovable web app, Web Speech API is the equivalent and works in Chrome/Edge/Safari.
- Permissions: browser auto-prompts for mic on first STT use. Fallback screen if denied with "Type instead" option.

### 5. Edge Cases

- **STT empty / unsupported browser**: show "We couldn't catch that. Tap to type instead." → text input fallback
- **Back button mid-flow**: exit Commute Mode, preserve answers in URL state so standard form pre-fills (handled by passing via location.state back to `Devotional.tsx`)
- **Audio interrupted**: pause; resume button on current step

### 6. Database — One Field

Add `submission_source` to the existing submissions table (currently `devotional_submissions` per memory):

```sql
ALTER TABLE devotional_submissions
ADD COLUMN submission_source TEXT NOT NULL DEFAULT 'typed'
CHECK (submission_source IN ('typed','commute','voice_memo'));
```

Standard form writes `'typed'`, Commute Mode writes `'commute'`, individual voice memos write `'voice_memo'`. Used for analytics.

### 7. Files

**New:**
- `src/pages/CommuteMode.tsx` — full-screen flow + step machine
- `src/components/devotional/AudioOptionsDropdown.tsx` — play button + dropdown
- `src/hooks/useSpeech.ts` — TTS + STT wrappers with browser-feature detection

**Modified:**
- `src/pages/Devotional.tsx` — replace headphones button with `AudioOptionsDropdown`; add Commute Mode launch
- `src/App.tsx` — add `/devotional/commute` route
- `src/index.css` / `tailwind.config.ts` — add `commute-blue` / `commute-blue-pale` semantic tokens

### Open Questions

1. **Submissions table name** — I see `devotional_submissions` referenced in memory but the spec says `submissions`. I'll verify the actual table name when implementing; if it doesn't exist yet, I'll add `submission_source` to whichever submissions table is current (or skip the migration if no submissions table exists yet and just track source in client state until the table is built).
2. **Build now or only after "fire it up"?** — Commute Mode is a *new* feature on top of the discipler MVP. Per your build-triggers memory, discipler accountability is the MVP priority. Want me to:
   - (a) build Commute Mode now as a UI-only prototype (Web Speech + local state, no DB writes), or
   - (b) wait until "fire it up" so submissions persist properly, or
   - (c) ship the **entry-point dropdown + Listen Only** now (which is just TTS, no DB), and defer the full Commute Mode flow?

Tell me which option and I'll switch to build mode.
