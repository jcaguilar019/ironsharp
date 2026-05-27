
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS survey_name TEXT,
  ADD COLUMN IF NOT EXISTS survey_age_range TEXT,
  ADD COLUMN IF NOT EXISTS survey_state TEXT,
  ADD COLUMN IF NOT EXISTS survey_education TEXT,
  ADD COLUMN IF NOT EXISTS survey_has_church BOOLEAN,
  ADD COLUMN IF NOT EXISTS survey_church_name TEXT,
  ADD COLUMN IF NOT EXISTS survey_devotional_rating INTEGER,
  ADD COLUMN IF NOT EXISTS survey_faith_journey TEXT,
  ADD COLUMN IF NOT EXISTS survey_goals TEXT[],
  ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMPTZ;
