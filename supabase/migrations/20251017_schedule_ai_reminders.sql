-- ============================================
-- Schedule daily AI smart reminders
-- ============================================

-- Create a cron job to send AI smart reminders once per day at 9 AM
SELECT cron.schedule(
  'send-daily-ai-reminders', -- name of the job
  '0 9 * * *',               -- cron expression: 9 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-smart-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment
COMMENT ON EXTENSION cron IS 'Schedule AI smart reminders daily at 9 AM';

-- To disable this job later, run:
-- SELECT cron.unschedule('send-daily-ai-reminders');
