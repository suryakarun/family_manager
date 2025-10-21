# WhatsApp Reminder System - Issues Fixed

## ✅ Fixed Issues:

### 1. **queue-reminder function** - FIXED
**Before:** Only logged reminders, didn't insert into database
**After:** 
- Fetches user's phone number from profiles table
- Inserts reminder into reminder_queue table with proper status
- Returns confirmation with reminder data

### 2. **send-whatsapp-reminder function** - FIXED
**Before:** Tried to queue reminders (wrong responsibility)
**After:**
- Now actually sends WhatsApp messages via Twilio API
- Fetches phone number from profiles
- Proper Twilio integration with error handling
- Returns success/failure with Twilio message SID

### 3. **send-scheduled-reminders function** - FIXED
**Before:** 
- Wrong import path for Supabase
- Queried for wrong status ("ready_to_send")
- Updated wrong column (scheduled_for instead of sent_at)
**After:**
- Correct CDN import for Supabase
- Queries for status="pending" and send_at <= now
- Updates sent_at timestamp on success
- Includes retry logic (up to 3 attempts)
- Proper error handling and logging

## 📊 System Architecture:

```
┌──────────────┐
│ User creates │
│    event     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ events table trigger │
│  (INSERT/UPDATE)     │
└──────┬───────────────┘
       │
       ▼
┌───────────────────┐
│ event-listener    │
│ Edge Function     │
└──────┬────────────┘
       │
       ▼
┌───────────────────┐
│ queue-reminder    │
│ Edge Function     │
│  • Fetch phone    │
│  • Insert queue   │
└──────┬────────────┘
       │
       ▼
┌─────────────────────┐
│  reminder_queue     │
│     table           │
│  status: pending    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────┐
│ pg_cron (every minute)  │
│ calls:                  │
│ send-scheduled-reminders│
└──────┬──────────────────┘
       │
       ▼
┌──────────────────────────┐
│ send-scheduled-reminders │
│ Edge Function            │
│  • Find pending reminders│
│  • Check if send_at due  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ send-whatsapp-reminder   │
│ Edge Function            │
│  • Fetch user phone      │
│  • Send via Twilio       │
└──────┬───────────────────┘
       │
       ▼
┌─────────────┐
│   Twilio    │
│  WhatsApp   │
│     API     │
└──────┬──────┘
       │
       ▼
    📱 User receives
   WhatsApp message
```

## 🗄️ Required Database Setup:

### 1. Update events table:
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '[]';
```

### 2. Create reminder_queue table:
```sql
CREATE TABLE IF NOT EXISTS reminder_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  phone TEXT,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_queue_status_sendat ON reminder_queue(status, send_at);
```

### 3. Create database trigger:
```sql
CREATE OR REPLACE FUNCTION trigger_event_listener()
RETURNS TRIGGER AS $$
BEGIN
  -- Call event-listener Edge Function via pg_net or http extension
  PERFORM
    net.http_post(
      url := 'https://boopfwfmuulofecarecx.supabase.co/functions/v1/event-listener',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'event_id', NEW.id,
        'reminder_settings', NEW.reminder_settings,
        'start_time', NEW.start_time
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_change
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW
  WHEN (NEW.reminder_settings IS NOT NULL AND NEW.reminder_settings::text != '[]')
  EXECUTE FUNCTION trigger_event_listener();
```

### 4. Setup pg_cron:
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule send-scheduled-reminders to run every minute
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
```

## 🔑 Required Environment Variables:

Set these in Supabase Dashboard > Project Settings > Edge Functions > Manage Secrets:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886  (or your Twilio WhatsApp number)
```

## ✅ Deployment Status:

All functions deployed successfully:
- ✅ queue-reminder
- ✅ send-whatsapp-reminder  
- ✅ send-scheduled-reminders
- ✅ event-listener

## 🧪 Testing:

### Test queue-reminder:
```bash
curl -X POST "https://boopfwfmuulofecarecx.supabase.co/functions/v1/queue-reminder" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
-d '{"user_id": "USER_UUID", "message": "Test reminder", "send_at": "2025-10-17T10:00:00Z"}'
```

### Test send-scheduled-reminders:
```bash
curl -X POST "https://boopfwfmuulofecarecx.supabase.co/functions/v1/send-scheduled-reminders" \
-H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## ⚠️ Still TODO:

1. **Run database migrations** - Execute the SQL scripts above in Supabase SQL Editor
2. **Set Twilio environment variables** - Add credentials to Supabase secrets
3. **Enable pg_net extension** - Required for database triggers to call Edge Functions
4. **Test end-to-end** - Create an event with WhatsApp reminder and verify delivery

## 📝 Notes:

- All functions are now using the correct Supabase client import
- Phone numbers are dynamically fetched from profiles table
- Retry logic prevents temporary failures from losing reminders
- Status tracking allows monitoring of reminder delivery
