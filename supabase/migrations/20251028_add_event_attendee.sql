-- Add event_attendee table to link family members to events
BEGIN;

CREATE TABLE IF NOT EXISTS public.event_attendee (
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT true,
  driving_needed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id)
);

-- Helper view to aggregate attendees on events
CREATE OR REPLACE VIEW public.event_with_attendees AS
SELECT e.*,
       json_agg(json_build_object(
         'member_id', ea.member_id,
         'required', ea.required,
         'driving_needed', ea.driving_needed
       ) ORDER BY ea.required DESC) FILTER (WHERE ea.member_id IS NOT NULL) AS attendees
FROM public.events e
LEFT JOIN public.event_attendee ea ON ea.event_id = e.id
GROUP BY e.id;

-- Enable Row Level Security and example policies (adapt to your auth/family logic if needed)
ALTER TABLE IF EXISTS public.event_attendee ENABLE ROW LEVEL SECURITY;

-- Policy: family members who appear as attendees (or their family) can SELECT
-- DROP existing policy if present, then create fresh one (more portable than CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "family can read" ON public.event_attendee;
  CREATE POLICY "family can read" ON public.event_attendee
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members m
      WHERE m.id = public.event_attendee.member_id
        AND m.family_id IN (
          SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: creator or family can INSERT/UPDATE/DELETE (write)
DROP POLICY IF EXISTS "creator or family can write" ON public.event_attendee;
CREATE POLICY "creator or family can write" ON public.event_attendee
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.family_members cm ON cm.user_id = e.created_by
      WHERE e.id = public.event_attendee.event_id
        AND cm.family_id = (
          SELECT m.family_id FROM public.family_members m WHERE m.id = public.event_attendee.member_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.family_members cm ON cm.user_id = e.created_by
      WHERE e.id = public.event_attendee.event_id
        AND cm.family_id = (
          SELECT m.family_id FROM public.family_members m WHERE m.id = public.event_attendee.member_id
        )
    )
  );

-- Example RPC to create an event with attendees in one call
CREATE OR REPLACE FUNCTION public.create_event_with_attendees(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  eid uuid;
BEGIN
  INSERT INTO public.events (
    id, family_id, created_by, title, description, location, start_time, end_time, recurrence_rule
  )
  VALUES (
    coalesce((payload->>'id')::uuid, gen_random_uuid()),
    (payload->>'family_id')::uuid,
    (payload->>'creator_id')::uuid,
    payload->>'title',
    payload->>'description',
    payload->>'location',
    (payload->>'starts_at')::timestamptz,
    (payload->>'ends_at')::timestamptz,
    payload->>'recurrence'
  )
  RETURNING id INTO eid;

  -- Insert attendees array of objects
  INSERT INTO public.event_attendee (event_id, member_id, required, driving_needed)
  SELECT eid,
         (a->>'member_id')::uuid,
         coalesce((a->>'required')::boolean, true),
         coalesce((a->>'driving_needed')::boolean, false)
  FROM jsonb_array_elements(coalesce(payload->'attendees','[]'::jsonb)) a;

  RETURN eid;
END;
$$;

-- Grant execute/select where appropriate (adjust roles to your setup)
GRANT EXECUTE ON FUNCTION public.create_event_with_attendees(jsonb) TO authenticated;
GRANT SELECT ON public.event_with_attendees TO authenticated;
