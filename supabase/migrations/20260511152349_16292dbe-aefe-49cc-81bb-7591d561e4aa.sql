
-- Allow the demo/preview user (anon role) to read & write its own plan progress
CREATE POLICY "Demo user can view progress"
ON public.user_plan_progress
FOR SELECT
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Demo user can insert progress"
ON public.user_plan_progress
FOR INSERT
TO anon
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Demo user can update progress"
ON public.user_plan_progress
FOR UPDATE
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Demo user can delete progress"
ON public.user_plan_progress
FOR DELETE
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);
