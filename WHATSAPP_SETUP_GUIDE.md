# WhatsApp Reminders Setup Guide

## Current Issue
Reminders only go to Twilio sandbox number, not to actual user phone numbers.

## Root Cause
You're using **Twilio WhatsApp Sandbox** which is for testing only. The sandbox has limitations:
- Only works for numbers that have "joined" the sandbox
- Each user must text "join <your-code>" to +14155238886 first
- Not suitable for production use

## Solution Options

### Option 1: Testing with Sandbox (Free)
**For each family member who wants to receive reminders:**

1. Save Twilio sandbox number: **+1 415 523 8886**
2. Send WhatsApp message: **join <your-sandbox-code>**
   - Find your code at: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
3. Wait for confirmation
4. Now they can receive reminders

**Pros:** Free, good for testing
**Cons:** Every user must manually join, resets every 3 days of inactivity

---

### Option 2: Twilio WhatsApp Business API (Production)
**For real production use:**

1. **Upgrade Account:**
   - Go to: https://console.twilio.com/
   - Navigate to: Messaging > WhatsApp > Senders
   - Click "Request Access" for WhatsApp Business API

2. **Requirements:**
   - Business verification (company documents)
   - Facebook Business Manager account
   - One-time setup fee (~$50-100)
   - Monthly costs based on usage

3. **Message Templates:**
   - All messages must use pre-approved templates
   - Submit templates for approval (takes 24-48 hours)
   - Example template:
     ```
     Reminder: Your event "{{1}}" starts at {{2}}. Location: {{3}}
     ```

4. **Sender Number:**
   - Must verify a business phone number
   - Or use Twilio's hosted number

**Pros:** Works for all users, no manual joining, professional
**Cons:** Costs money, requires business verification, template approval process

---

### Option 3: Alternative - Use Twilio SMS (Simpler)
**If WhatsApp is too complex:**

1. **Switch to regular SMS:**
   - Much simpler setup
   - No sandbox limitations
   - Works with all phone numbers
   - Costs: ~$0.0075 per SMS in India

2. **Code changes needed:**
   - Update `send-whatsapp-reminder` function
   - Remove `whatsapp:` prefix from phone numbers
   - Change message format for SMS

**Pros:** Simple, reliable, works immediately
**Cons:** SMS instead of WhatsApp (some users prefer WhatsApp)

---

## Recommended Approach

**For Testing (Now):**
- Use Twilio Sandbox
- Have 2-3 family members join the sandbox
- Test reminder functionality

**For Production (Later):**
- Option A: Apply for WhatsApp Business API if you have a business
- Option B: Switch to Twilio SMS for simplicity and reliability

---

## Quick Fix for Sandbox Testing

To test reminders with the sandbox:

1. Each tester sends this WhatsApp message:
   ```
   join <your-code>
   ```
   To: **+1 415 523 8886**

2. Verify phone numbers in your profiles table match the format:
   ```
   +918884509081  ✅ Correct (with country code, no spaces)
   918884509081   ❌ Wrong (missing +)
   +91 8884509081 ❌ Wrong (has space)
   ```

3. Check Supabase Edge Function logs:
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/logs
   - Filter by: `send-whatsapp-reminder`
   - Look for errors

---

## How to Check Your Twilio Sandbox Code

1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Look for: "To connect to your sandbox, send: **join <code>**"
3. Share this with family members

---

## Testing Checklist

- [ ] Twilio credentials are set in Supabase (Dashboard > Project Settings > Edge Functions > Secrets)
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
  - TWILIO_WHATSAPP_NUMBER = +14155238886
- [ ] Test user has joined the sandbox
- [ ] Phone number in profiles table has correct format (+91...)
- [ ] Edge function logs show no errors
- [ ] Test reminder by creating an event with WhatsApp reminder enabled

---

## If You Want to Switch to SMS

Let me know and I can update the function to use regular SMS instead of WhatsApp.
