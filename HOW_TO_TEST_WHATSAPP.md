# Test and Debug WhatsApp Reminders

## Step-by-Step Testing Process

### 1. Update reminder to send NOW (in Supabase SQL Editor)

```sql
-- Force update specific reminder to send now
UPDATE reminder_queue 
SET send_at = NOW() - INTERVAL '5 minutes',
    status = 'pending'
WHERE message = 'Test Event Reminder'
AND status = 'pending'
LIMIT 1;

-- Verify it's ready
SELECT 
  id,
  message,
  send_at,
  NOW() as current_time,
  status,
  CASE WHEN send_at <= NOW() THEN '✓ READY' ELSE '✗ NOT READY' END as ready
FROM reminder_queue 
WHERE status = 'pending'
ORDER BY send_at
LIMIT 5;
```

### 2. Test the function manually (in PowerShell)

```powershell
cd C:\Users\kapil\OneDrive\Documents\Idiot
powershell -ExecutionPolicy Bypass -File test-send-reminders.ps1
```

### 3. Check the logs in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/boopfwfmuulofecarecx/logs/edge-functions

Look for:
- `send-scheduled-reminders` function logs
- Any errors or "Processing X reminders" messages

### 4. Check reminder status after running

```sql
-- See what happened to the reminder
SELECT 
  id,
  message,
  status,
  send_at,
  sent_at,
  attempts,
  last_error
FROM reminder_queue 
ORDER BY created_at DESC
LIMIT 10;
```

### 5. Manual send test (bypass queue)

If the above doesn't work, test WhatsApp directly:

```sql
-- Get your user_id
SELECT id, full_name, phone FROM profiles WHERE phone IS NOT NULL LIMIT 1;
```

Then in PowerShell:

```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDA4NzA3OCwiZXhwIjoyMDc1NjYzMDc4fQ.Q5QJloEHRgPNmSTcOTsE1TevjH3MCrdGVDWUPSifHSI"
    "Content-Type" = "application/json"
}

$body = @{
    user_id = "dcdd04ee-9806-4dcd-89bb-92fb77cc5074"  # Replace with actual user_id
    message = "Test WhatsApp message from Family Calendar!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://boopfwfmuulofecarecx.supabase.co/functions/v1/send-whatsapp-reminder" -Method Post -Headers $headers -Body $body
```

### 6. Troubleshooting Checklist

- [ ] Twilio credentials are set (check Secrets page)
- [ ] Phone number is in E.164 format (+918884509081)
- [ ] You've joined Twilio WhatsApp Sandbox
- [ ] `reminder_queue` table exists and has data
- [ ] `send_at` timestamp is in the past
- [ ] Status is 'pending'
- [ ] Edge functions are deployed
- [ ] Check Supabase function logs for errors

### Expected Flow:

1. Reminder with `send_at` <= NOW() and `status = 'pending'`
2. `send-scheduled-reminders` finds it
3. Marks as `status = 'processing'`
4. Calls `send-whatsapp-reminder` with user_id and message
5. `send-whatsapp-reminder` fetches phone from profiles
6. Sends via Twilio API
7. Marks as `status = 'sent'` with `sent_at` timestamp

### Common Issues:

**"No reminders to send"**
- Check timezone: send_at might be in different timezone
- Verify status is 'pending' not 'processing' or 'sent'

**"User not found or no phone number"**
- Update your profile with phone number in profiles table

**"Twilio credentials missing"**
- Add secrets in Supabase Edge Functions settings

**No error but no WhatsApp**
- Check Twilio console logs
- Verify WhatsApp Sandbox is joined
- Phone number format must be +[country][number]
