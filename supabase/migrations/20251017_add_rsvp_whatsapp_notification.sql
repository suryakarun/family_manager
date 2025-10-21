-- ============================================
-- Add RSVP WhatsApp Notification System
-- ============================================

-- Create function to queue RSVP notifications
CREATE OR REPLACE FUNCTION queue_rsvp_notification()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  creator_profile RECORD;
  responder_profile RECORD;
  status_text TEXT;
BEGIN
  -- Get event details
  SELECT e.*, p.phone_number as creator_phone, p.full_name as creator_name
  INTO event_record
  FROM events e
  LEFT JOIN profiles p ON p.id = e.created_by
  WHERE e.id = NEW.event_id;

  -- Get responder details
  SELECT full_name, phone_number
  INTO responder_profile
  FROM profiles
  WHERE id = NEW.user_id;

  -- Only send notification if:
  -- 1. Event creator has a phone number
  -- 2. Responder is not the creator
  -- 3. RSVP status changed (not initial creation)
  IF event_record.creator_phone IS NOT NULL 
     AND NEW.user_id != event_record.created_by 
     AND (TG_OP = 'UPDATE' OR NEW.rsvp_at IS NOT NULL) THEN

    -- Convert status to readable text
    status_text := CASE NEW.status
      WHEN 'accepted' THEN '✅ Going'
      WHEN 'pending' THEN '❓ Maybe'
      WHEN 'declined' THEN '❌ Not Going'
      ELSE 'Unknown'
    END;

    -- Queue the notification
    INSERT INTO reminder_queue (
      user_id,
      phone,
      message,
      send_at,
      status
    ) VALUES (
      event_record.created_by, -- Send to event creator
      event_record.creator_phone,
      format(
        E'📅 *RSVP Update*\n\n*%s* responded to your event:\n\n🎯 Event: %s\n👤 Response: %s\n📆 Date: %s\n\n_Family Calendar_',
        COALESCE(responder_profile.full_name, 'Someone'),
        event_record.title,
        status_text,
        to_char(event_record.start_time, 'Mon DD, YYYY at HH12:MI AM')
      ),
      NOW(), -- Send immediately
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_rsvp_notification ON event_invites;

-- Create trigger for RSVP notifications
CREATE TRIGGER trigger_rsvp_notification
  AFTER INSERT OR UPDATE OF status
  ON event_invites
  FOR EACH ROW
  EXECUTE FUNCTION queue_rsvp_notification();

-- Add comment
COMMENT ON FUNCTION queue_rsvp_notification() IS 'Queues WhatsApp notification to event creator when someone RSVPs';
