# 📅 Family Smart Calendar

A modern, feature-rich family calendar application with WhatsApp reminder integration.

## ✨ Features

- 📆 **Interactive Calendar** - Beautiful calendar view with day, week, and month views
- 👨‍👩‍👧‍👦 **Family Management** - Create and manage family groups
- 📱 **WhatsApp Reminders** - Automatic WhatsApp notifications via Twilio
- ✅ **Event Checklists** - Add to-do items to your events
- 📝 **Notes & Descriptions** - Detailed event information
- 📍 **Location Tracking** - Add locations to events
- 🎨 **Color Coding** - Organize events with custom colors
- ⏰ **Smart Reminders** - Set reminders from 5 minutes to 1 day before events
- 🚫 **Past Date Protection** - Prevents creating events in the past
- 🔔 **Real-time Notifications** - Get notified via WhatsApp at the right time

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Edge Functions (Deno runtime)
  - Real-time subscriptions
  - Authentication
- **Twilio WhatsApp API** - Message delivery
- **pg_cron** - Scheduled reminder processing

## 📦 Project Structure

```
├── src/
│   ├── components/
│   │   ├── dashboardheader.tsx    # App header
│   │   ├── eventmodal.tsx         # Event creation/editing
│   │   ├── familycalendar.tsx     # Main calendar view
│   │   └── familyselector.tsx     # Family switcher
│   ├── pages/
│   │   ├── auth.tsx               # Authentication
│   │   ├── dashboard.tsx          # Main dashboard
│   │   └── JoinFamily.tsx         # Join family flow
│   ├── integrations/supabase/
│   │   ├── client.ts              # Supabase client
│   │   └── types.ts               # TypeScript types
│   └── lib/
│       └── utils.ts               # Utility functions
├── supabase/
│   ├── functions/
│   │   ├── queue-reminder/        # Queue WhatsApp reminders
│   │   ├── send-whatsapp-reminder/ # Send via Twilio
│   │   ├── send-scheduled-reminders/ # Process queue
│   │   └── event-listener/        # Event trigger handler
│   └── migrations/                # Database migrations
└── public/                        # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ & npm
- Supabase account
- Twilio account with WhatsApp API access

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd family-smart-calendar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## ⚙️ Supabase Setup

### 1. Database Tables

The application uses these tables:
- `profiles` - User profiles with phone numbers
- `families` - Family groups
- `events` - Calendar events with reminders
- `reminder_queue` - Pending WhatsApp reminders

### 2. Edge Functions

Deploy the following functions:

```bash
# Deploy all functions
supabase functions deploy queue-reminder
supabase functions deploy send-whatsapp-reminder
supabase functions deploy send-scheduled-reminders
supabase functions deploy event-listener
```

### 3. Configure Secrets

Set up Twilio credentials:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 4. Set up pg_cron

The reminder system uses pg_cron to process the queue every minute:

```sql
SELECT cron.schedule(
  'process-reminders',
  '* * * * *',
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/send-scheduled-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);
```

## 📱 WhatsApp Setup

### Twilio Configuration

1. **Create Twilio Account**
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get your Account SID and Auth Token

2. **Enable WhatsApp Sandbox**
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Join sandbox by sending: `join <your-code>`
   - Save sandbox number: `+14155238886`

3. **Add User Phone Numbers**
   
   Update user profiles with phone numbers (E.164 format):
   ```sql
   UPDATE profiles 
   SET phone = '+919876543210' 
   WHERE id = 'user_id';
   ```

## 🔔 How Reminders Work

1. **User creates event** with WhatsApp reminder
2. **Frontend** calls `queue-reminder` Edge Function
3. **Reminder queued** in database with `send_at` time
4. **pg_cron** triggers `send-scheduled-reminders` every minute
5. **Reminders processed** and sent via Twilio WhatsApp API
6. **User receives** formatted WhatsApp message

### Reminder Message Format

```
🔔 Event Reminder

📌 Team Meeting

🕐 Starts: 03:30 pm on 17 Oct 2025
📍 Location: Conference Room A

📝 Description:
Quarterly planning discussion

📋 Notes:
Bring presentation slides

✅ Checklist:
⬜ Prepare agenda
☑️ Review last quarter
⬜ Book projector
```

## 🎨 Customization

### Adding New Reminder Times

Edit `src/components/eventmodal.tsx`:

```tsx
<select>
  <option value="5">5 minutes before</option>
  <option value="10">10 minutes before</option>
  {/* Add more options */}
</select>
```

### Changing Message Format

Edit `src/components/eventmodal.tsx` in the `queueWhatsAppReminder` function:

```tsx
let message = `🔔 *Event Reminder*\n\n`;
// Customize message template
```

## 🐛 Troubleshooting

### Reminders not sending

1. Check pg_cron is running:
   ```sql
   SELECT * FROM cron.job;
   ```

2. Check reminder queue:
   ```sql
   SELECT * FROM reminder_queue WHERE status = 'pending';
   ```

3. Verify Twilio credentials in Supabase secrets

4. Check Edge Function logs in Supabase Dashboard

### WhatsApp messages not received

1. Ensure phone number is in E.164 format (+CountryCode Number)
2. Verify user joined WhatsApp Sandbox
3. Check 24-hour sandbox window hasn't expired
4. Verify phone number in `profiles` table

## 📄 License

This project is built with [Lovable](https://lovable.dev)

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, Supabase, and Twilio
