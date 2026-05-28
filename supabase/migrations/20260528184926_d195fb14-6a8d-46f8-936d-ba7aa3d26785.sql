
DROP POLICY IF EXISTS "Demo views submissions" ON public.devotional_submissions;
DROP POLICY IF EXISTS "Demo inserts" ON public.devotional_submissions;
DROP POLICY IF EXISTS "Demo updates" ON public.devotional_submissions;

DROP POLICY IF EXISTS "Demo views" ON public.disciple_relationships;
DROP POLICY IF EXISTS "Demo creates" ON public.disciple_relationships;

DROP POLICY IF EXISTS "Demo views notes" ON public.discipler_notes;
DROP POLICY IF EXISTS "Demo sends" ON public.discipler_notes;

DROP POLICY IF EXISTS "Demo views members" ON public.group_members;
DROP POLICY IF EXISTS "Demo joins" ON public.group_members;
DROP POLICY IF EXISTS "Demo removes" ON public.group_members;

DROP POLICY IF EXISTS "Demo views groups" ON public.groups;
DROP POLICY IF EXISTS "Demo creates groups" ON public.groups;
DROP POLICY IF EXISTS "Demo updates group" ON public.groups;

DROP POLICY IF EXISTS "Demo inserts profile" ON public.profiles;
DROP POLICY IF EXISTS "Demo updates profile" ON public.profiles;

DROP POLICY IF EXISTS "Demo reads reactions" ON public.submission_reactions;
DROP POLICY IF EXISTS "Demo reacts" ON public.submission_reactions;
DROP POLICY IF EXISTS "Demo unreacts" ON public.submission_reactions;

DROP POLICY IF EXISTS "Demo user can view progress" ON public.user_plan_progress;
DROP POLICY IF EXISTS "Demo user can insert progress" ON public.user_plan_progress;
DROP POLICY IF EXISTS "Demo user can update progress" ON public.user_plan_progress;
DROP POLICY IF EXISTS "Demo user can delete progress" ON public.user_plan_progress;
