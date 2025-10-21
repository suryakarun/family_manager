-- ============================================
-- Event Photo Gallery System
-- ============================================

-- Create event_photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-photos',
  'event-photos',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event photos
-- Policy: Anyone can view event photos (public bucket)
CREATE POLICY "Public event photos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-photos');

-- Policy: Authenticated users can upload event photos
CREATE POLICY "Authenticated users can upload event photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-photos');

-- Policy: Users can update their own photos
CREATE POLICY "Users can update their own event photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own event photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create event_photos table
CREATE TABLE IF NOT EXISTS public.event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create photo_reactions table
CREATE TABLE IF NOT EXISTS public.photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('❤️', '👍', '😂', '🎉', '😍', '🔥')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, user_id, reaction) -- One reaction type per user per photo
);

-- Enable RLS
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_photos
-- Users can view photos for events in their family
CREATE POLICY "Users can view photos for family events"
ON public.event_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.family_members fm ON e.family_id = fm.family_id
    WHERE e.id = event_photos.event_id
    AND fm.user_id = auth.uid()
  )
);

-- Users can upload photos to events in their family
CREATE POLICY "Users can upload photos to family events"
ON public.event_photos FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.family_members fm ON e.family_id = fm.family_id
    WHERE e.id = event_photos.event_id
    AND fm.user_id = auth.uid()
  )
);

-- Users can update their own photos
CREATE POLICY "Users can update their own photos"
ON public.event_photos FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON public.event_photos FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- RLS Policies for photo_reactions
-- Users can view all reactions on photos they can see
CREATE POLICY "Users can view reactions on accessible photos"
ON public.photo_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_photos ep
    JOIN public.events e ON ep.event_id = e.id
    JOIN public.family_members fm ON e.family_id = fm.family_id
    WHERE ep.id = photo_reactions.photo_id
    AND fm.user_id = auth.uid()
  )
);

-- Users can add reactions
CREATE POLICY "Users can add reactions"
ON public.photo_reactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.photo_reactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photo_reactions_photo_id ON public.photo_reactions(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_reactions_user_id ON public.photo_reactions(user_id);

-- Function to queue photo upload notifications
CREATE OR REPLACE FUNCTION queue_photo_upload_notification()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  uploader_profile RECORD;
  photo_count INTEGER;
BEGIN
  -- Get event details
  SELECT e.*, e.title, e.family_id
  INTO event_record
  FROM events e
  WHERE e.id = NEW.event_id;

  -- Get uploader details
  SELECT full_name, phone_number
  INTO uploader_profile
  FROM profiles
  WHERE id = NEW.uploaded_by;

  -- Count photos uploaded in last 5 minutes by same user for this event
  SELECT COUNT(*)
  INTO photo_count
  FROM event_photos
  WHERE event_id = NEW.event_id
  AND uploaded_by = NEW.uploaded_by
  AND uploaded_at > NOW() - INTERVAL '5 minutes';

  -- Only send notification for first photo in the batch
  IF photo_count = 1 THEN
    -- Queue notifications for all family members except uploader
    INSERT INTO reminder_queue (
      user_id,
      phone,
      message,
      send_at,
      status
    )
    SELECT
      fm.user_id,
      p.phone_number,
      format(
        E'📸 *New Photos Added*\n\n*%s* added photos to:\n\n🎯 Event: %s\n\nView them in your Family Calendar!\n\n_Family Calendar_',
        COALESCE(uploader_profile.full_name, 'Someone'),
        event_record.title
      ),
      NOW(),
      'pending'
    FROM family_members fm
    JOIN profiles p ON p.id = fm.user_id
    WHERE fm.family_id = event_record.family_id
    AND fm.user_id != NEW.uploaded_by
    AND p.phone_number IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo upload notifications
DROP TRIGGER IF EXISTS trigger_photo_upload_notification ON event_photos;
CREATE TRIGGER trigger_photo_upload_notification
  AFTER INSERT ON event_photos
  FOR EACH ROW
  EXECUTE FUNCTION queue_photo_upload_notification();

-- Add comments
COMMENT ON TABLE public.event_photos IS 'Stores photos and videos uploaded to events';
COMMENT ON TABLE public.photo_reactions IS 'Stores emoji reactions to event photos';
COMMENT ON FUNCTION queue_photo_upload_notification() IS 'Queues WhatsApp notification when photos are uploaded to events';
