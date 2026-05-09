
CREATE TABLE public.study_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.devotional_plans(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  passage_reference text NOT NULL,
  source text,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, day_number)
);

CREATE INDEX idx_study_notes_plan_day ON public.study_notes(plan_id, day_number);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view study notes"
  ON public.study_notes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view study notes"
  ON public.study_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_study_notes_updated_at
  BEFORE UPDATE ON public.study_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
