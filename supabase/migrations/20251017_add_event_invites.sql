-- ============================================
-- Create event_invites table for RSVP system
-- ============================================

-- Create event_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create event_invites table
CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status event_status DEFAULT 'pending',
  rsvp_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_invites_event_id ON public.event_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_user_id ON public.event_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_status ON public.event_invites(status);

-- Enable RLS
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_invites
-- Users can view all invites for events in their family
CREATE POLICY "Users can view event invites in their families"
ON public.event_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.family_members fm ON e.family_id = fm.family_id
    WHERE e.id = event_invites.event_id
    AND fm.user_id = auth.uid()
  )
);

-- Users can insert their own RSVP
CREATE POLICY "Users can create their own RSVP"
ON public.event_invites FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.family_members fm ON e.family_id = fm.family_id
    WHERE e.id = event_id
    AND fm.user_id = auth.uid()
  )
);

-- Users can update their own RSVP
CREATE POLICY "Users can update their own RSVP"
ON public.event_invites FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own RSVP
CREATE POLICY "Users can delete their own RSVP"
ON public.event_invites FOR DELETE
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.event_invites TO authenticated;
GRANT USAGE ON TYPE event_status TO authenticated;
