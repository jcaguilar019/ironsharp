ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_tier text NOT NULL DEFAULT 'free'
    CHECK (membership_tier IN ('free','connect','sharpen','family')),
  ADD COLUMN IF NOT EXISTS membership_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_source text NOT NULL DEFAULT 'none'
    CHECK (membership_source IN ('none','stripe','apple_iap','google_iap','promo'));