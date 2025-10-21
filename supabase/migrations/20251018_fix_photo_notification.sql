-- Fix photo upload notification trigger
-- The reminder_queue table structure doesn't match what the trigger expects

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_photo_upload_notification ON event_photos;
DROP FUNCTION IF EXISTS queue_photo_upload_notification();

-- Recreate the function with correct column names
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
      event_id,
      user_id,
      message,
      send_at,
      status,
      payload
    )
    SELECT
      NEW.event_id,
      fm.user_id,
      format(
        E'📸 *New Photos Added*\n\n*%s* added photos to:\n\n🎯 Event: %s\n\nView them in your Family Calendar!\n\n_Family Calendar_',
        COALESCE(uploader_profile.full_name, 'Someone'),
        event_record.title
      ),
      NOW(),
      'pending',
      jsonb_build_object(
        'type', 'photo_upload',
        'event_id', NEW.event_id,
        'uploader_id', NEW.uploaded_by,
        'phone_number', p.phone_number
      )
    FROM family_members fm
    JOIN profiles p ON p.id = fm.user_id
    WHERE fm.family_id = event_record.family_id
    AND fm.user_id != NEW.uploaded_by
    AND p.phone_number IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_photo_upload_notification
  AFTER INSERT ON event_photos
  FOR EACH ROW
  EXECUTE FUNCTION queue_photo_upload_notification();

COMMENT ON FUNCTION queue_photo_upload_notification() IS 'Queues WhatsApp notification when photos are uploaded to events (5-minute batching)';
