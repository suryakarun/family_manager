# 🚀 How to Enable WhatsApp Reminders - Step by Step

## Current Status: ❌ NOT WORKING YET

Your Edge Functions are deployed, but WhatsApp reminders won't work until you complete these steps:

---

## 📋 STEP 1: Run Database Migration (REQUIRED)

### Option A: Using Supabase Dashboard (EASIEST)
1. Go to https://supabase.com/dashboard/project/boopfwfmuulofecarecx
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy ALL content from: `supabase/migrations/20251016_complete_whatsapp_setup.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. ✅ You should see success messages

### Option B: Using Supabase CLI
```bash
cd c:\Users\kapil\OneDrive\Documents\Idiot
supabase db push
```

---

## 🔐 STEP 2: Add Twilio Credentials (REQUIRED)

### Get Your Twilio Credentials:
1. Go to https://console.twilio.com/
2. Sign in (or create free account)
3. Copy your:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
4. Set up WhatsApp Sandbox:
   - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   - Send "join <your-code>" to the Twilio WhatsApp number
   - Note the WhatsApp number (e.g., +14155238886)

### Add to Supabase:
1. Go to: https://supabase.com/dashboard/project/boopfwfmuulofecarecx/settings/functions
2. Scroll to **Secrets** section
3. Click **Add Secret** and add:
   ```
   Name: TWILIO_ACCOUNT_SID
   Value: (paste your Account SID)
   ```
4. Click **Add Secret** again:
   ```
   Name: TWILIO_AUTH_TOKEN
   Value: (paste your Auth Token)
   ```
5. Click **Add Secret** again:
   ```
   Name: TWILIO_WHATSAPP_NUMBER
   Value: +14155238886 (your Twilio WhatsApp number)
   ```

---

## 🔄 STEP 3: Enable pg_cron (OPTIONAL but RECOMMENDED)

### If pg_cron is available:
Run this SQL in Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'send-scheduled-whatsapp-reminders',
  '* * * * *',  -- Every minute
  $$
    SELECT net.http_post(
      url := 'https://boopfwfmuulofecarecx.supabase.co/functions/v1/send-scheduled-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    );
  $$
);
```
Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key from:
https://supabase.com/dashboard/project/boopfwfmuulofecarecx/settings/api

### If pg_cron is NOT available:
You'll need to manually trigger reminders or use an external cron service like:
- Cron-job.org
- GitHub Actions
- Vercel Cron

---

## ✅ STEP 4: Verify Setup

Run this SQL to check everything is ready:
```sql
-- Check tables
SELECT 'reminder_queue exists' as status 
FROM information_schema.tables 
WHERE table_name = 'reminder_queue';

-- Check events columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('user_id', 'notes', 'checklist', 'reminder_settings');

-- Check trigger
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_event_reminders';
```

---

## 🧪 STEP 5: Test WhatsApp Reminder

### 5.1 Make sure your profile has a phone number:
```sql
-- Check your phone number in profiles
SELECT id, full_name, phone 
FROM profiles 
WHERE id = auth.uid();

-- If phone is missing, update it:
UPDATE profiles 
SET phone = '+918884509081'  -- Replace with your actual WhatsApp number
WHERE id = auth.uid();
```

### 5.2 Create a test event with reminder:
1. In your app, create a new event
2. Set start time to **5 minutes from now**
3. ✅ **Enable "Send WhatsApp Reminder"**
4. Set reminder to **1 minute before**
5. Save the event

### 5.3 Wait and check:
- Wait for the trigger time
- You should receive a WhatsApp message!

### 5.4 Debug if not working:
```sql
-- Check if reminder was queued
SELECT * FROM reminder_queue 
ORDER BY created_at DESC 
LIMIT 5;

-- Check reminder status
SELECT id, message, send_at, status, attempts, last_error 
FROM reminder_queue 
WHERE status != 'sent';
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "reminder_queue table doesn't exist"
**Fix:** Run STEP 1 (database migration)

### Issue 2: "User not found or no phone number"
**Fix:** Add phone number to your profile:
```sql
UPDATE profiles SET phone = '+YOUR_PHONE' WHERE id = auth.uid();
```

### Issue 3: "Twilio credentials missing"
**Fix:** Complete STEP 2 (add Twilio secrets)

### Issue 4: Reminders not being sent automatically
**Fix:** Either:
- Enable pg_cron (STEP 3)
- OR manually trigger: 
  ```bash
  curl -X POST https://boopfwfmuulofecarecx.supabase.co/functions/v1/send-scheduled-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
  ```

### Issue 5: WhatsApp not delivering
**Fix:** 
- Make sure you joined Twilio WhatsApp Sandbox
- Phone number must be in E.164 format (+country code + number)
- Check Twilio console logs: https://console.twilio.com/us1/monitor/logs/sms

---

## 📊 Monitor Reminders

Check Supabase logs:
https://supabase.com/dashboard/project/boopfwfmuulofecarecx/logs/edge-functions

Check reminder queue:
```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(send_at) as next_reminder
FROM reminder_queue
GROUP BY status;
```

---

## ✅ Success Criteria

You'll know it's working when:
1. ✅ You create an event with WhatsApp reminder
2. ✅ Reminder appears in `reminder_queue` table with status='pending'
3. ✅ At the scheduled time, status changes to 'sent'
4. ✅ You receive WhatsApp message on your phone
5. ✅ Logs show successful Twilio API calls

---

## 🆘 Need Help?

1. Check Supabase Edge Function logs
2. Check `reminder_queue` table for errors
3. Check Twilio console for delivery logs
4. Run the verification SQL queries above

**Current deployment:** All functions are deployed ✅
**Remaining:** Complete STEPs 1 and 2 above!
