-- ============================================
-- STEP 1: Add missing columns to events table
-- ============================================

-- Add user_id column (for backward compatibility with created_by)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add notes column
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add checklist column (JSON array)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- Add reminder_settings column (JSON array)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '[]'::jsonb;

-- Migrate existing created_by data to user_id
UPDATE public.events 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_reminder_settings ON public.events USING GIN (reminder_settings);

-- ============================================
-- STEP 2: Create reminder_queue table
-- ============================================

CREATE TABLE IF NOT EXISTS public.reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reminder_queue_status_sendat 
ON public.reminder_queue(status, send_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reminder_queue_user_id 
ON public.reminder_queue(user_id);

-- Add comments
COMMENT ON TABLE public.reminder_queue IS 'Queue for scheduled WhatsApp reminders';
COMMENT ON COLUMN public.reminder_queue.send_at IS 'When to send the reminder (UTC)';
COMMENT ON COLUMN public.reminder_queue.status IS 'pending, processing, sent, or failed';
COMMENT ON COLUMN public.reminder_queue.attempts IS 'Number of send attempts (max 3)';

-- ============================================
-- STEP 3: Enable required extensions
-- ============================================

-- Enable pg_net for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron for scheduled jobs (may require Supabase support to enable)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- STEP 4: Create function to process event reminders
-- ============================================

CREATE OR REPLACE FUNCTION process_event_reminders()
RETURNS TRIGGER AS $$
DECLARE
  reminder JSONB;
  offset_minutes INTEGER;
  send_time TIMESTAMPTZ;
  message_text TEXT;
BEGIN
  -- Only process if reminder_settings exists and is not empty
  IF NEW.reminder_settings IS NULL OR jsonb_array_length(NEW.reminder_settings) = 0 THEN
    RETURN NEW;
  END IF;

  -- Loop through each reminder setting
  FOR reminder IN SELECT * FROM jsonb_array_elements(NEW.reminder_settings)
  LOOP
    -- Check if it's a WhatsApp reminder
    IF reminder->>'method' = 'whatsapp' THEN
      offset_minutes := (reminder->>'time_offset_minutes')::INTEGER;
      
      -- Calculate when to send (event start time minus offset)
      send_time := NEW.start_time - (offset_minutes || ' minutes')::INTERVAL;
      
      -- Build message
      message_text := format(
        'Reminder: Your event "%s" starts at %s. Location: %s',
        NEW.title,
        to_char(NEW.start_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI on DD Mon YYYY'),
        COALESCE(NEW.location, 'Not specified')
      );

      -- Call event-listener Edge Function via pg_net
      PERFORM net.http_post(
        url := 'https://boopfwfmuulofecarecx.supabase.co/functions/v1/event-listener',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'message', message_text,
          'send_at', send_time
        )
      );
      
      RAISE NOTICE 'Reminder queued for event % at %', NEW.id, send_time;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Create trigger on events table
-- ============================================

DROP TRIGGER IF EXISTS trigger_event_reminders ON public.events;

CREATE TRIGGER trigger_event_reminders
  AFTER INSERT OR UPDATE OF reminder_settings, start_time ON public.events
  FOR EACH ROW
  WHEN (NEW.reminder_settings IS NOT NULL AND NEW.reminder_settings::text != '[]')
  EXECUTE FUNCTION process_event_reminders();

-- ============================================
-- STEP 6: Setup pg_cron job (run separately if pg_cron is available)
-- ============================================

/*
-- Uncomment and run this if pg_cron is enabled on your database:

SELECT cron.schedule(
  'send-scheduled-whatsapp-reminders',
  '* * * * *',  -- Every minute
  $$
    SELECT net.http_post(
      url := 'https://boopfwfmuulofecarecx.supabase.co/functions/v1/send-scheduled-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);

-- To check scheduled jobs:
SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('send-scheduled-whatsapp-reminders');
*/

-- ============================================
-- STEP 7: Grant necessary permissions
-- ============================================

-- Grant access to reminder_queue
GRANT SELECT, INSERT, UPDATE ON public.reminder_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reminder_queue TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if reminder_queue table exists
SELECT 'reminder_queue table created' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'reminder_queue'
);

-- Check events table columns
SELECT 
  'events table updated' as status,
  COUNT(*) as columns_added
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'events'
  AND column_name IN ('user_id', 'notes', 'checklist', 'reminder_settings');

-- Check trigger
SELECT 
  'trigger created' as status,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_event_reminders';

-- Show sample data
SELECT 'Sample pending reminders' as info;
SELECT id, user_id, message, send_at, status 
FROM public.reminder_queue 
WHERE status = 'pending' 
LIMIT 5;
