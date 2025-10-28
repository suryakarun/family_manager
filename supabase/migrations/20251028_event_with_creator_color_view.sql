-- Create a view that returns events joined with creator member info (color and name)
CREATE OR REPLACE VIEW public.event_with_creator_color AS
SELECT
  e.*,
  fm.id AS creator_member_id,
  p.full_name AS creator_name,
  fm.color AS creator_color,
  p.avatar_url AS creator_avatar_url
FROM public.events e
JOIN public.family_members fm
  ON fm.user_id = e.created_by
  AND fm.family_id = e.family_id
JOIN public.profiles p
  ON p.id = e.created_by;

-- Grant select to authenticated/anon if needed (adjust according to your RLS)
-- GRANT SELECT ON public.event_with_creator_color TO authenticated;
