# AI Travel Planning Assistant Setup Guide

## Overview
The AI Travel Planning Assistant analyzes invitation images, checks your family calendar for conflicts, fetches weather forecasts, and suggests optimal travel dates—all automatically sending the recommendations via WhatsApp.

## Features
- **Image Recognition**: Uses OpenAI Vision API to parse invitation details from images
- **Smart Scheduling**: Analyzes family calendar events to detect conflicts
- **Weather Integration**: Fetches 14-day weather forecasts for destination cities
- **Conflict Resolution**: AI suggests solutions for schedule overlaps
- **WhatsApp Notifications**: Automatically sends formatted recommendations

## Prerequisites

### 1. OpenAI API Key (Required for Image Analysis)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. **Model Required**: GPT-4o (GPT-4 with vision capabilities)
4. **Estimated Cost**: ~$0.01-0.03 per invitation analysis

### 2. Weather API Key (Optional but Recommended)
Choose one of these providers:

#### Option A: WeatherAPI.com (Recommended - Free Tier Available)
1. Sign up at https://www.weatherapi.com/signup.aspx
2. Free tier includes:
   - 1 million calls/month
   - 14-day forecast
   - Real-time weather
3. Copy your API key from the dashboard

#### Option B: OpenWeatherMap
1. Sign up at https://openweathermap.org/api
2. Free tier includes:
   - 60 calls/minute
   - 5-day forecast (limited compared to WeatherAPI)
3. Note: You'll need to modify the code to use their API format

## Setup Instructions

### Flight and Railway API Setup (Optional, enables live options)

Set these as Supabase Edge Function secrets so your keys are never exposed to the browser:

Required for flight options (Amadeus test/production credentials):

```
FLIGHT_API_PROVIDER=amadeus
AMADEUS_API_KEY=YOUR_FLIGHT_API_KEY
AMADEUS_API_SECRET=YOUR_FLIGHT_API_SECRET
```

Required for Indian Railways options (railwayapi.in):

```
RAILWAY_API_PROVIDER=railwayapi.in
RAILWAY_API_KEY=YOUR_RAILWAY_API_KEY
```

You can also use the generic names instead of Amadeus-specific ones:

```
FLIGHT_API_KEY=...
FLIGHT_API_SECRET=...
```

After setting, redeploy the function (see Step 2 below).

### Step 1: Add Environment Variables to Supabase

1. Go to your Supabase project dashboard:
   - Navigate to https://supabase.com/dashboard/project/boopfwfmuulofecarecx
   - Click "Settings" → "Edge Functions" → "Environment Variables"

2. Add these secrets (include your optional flight/railway keys if available):
   ```
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   WEATHER_API_KEY=xxxxxxxxxxxxx
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx (already configured)
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx (already configured)
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 (already configured)
  
   # Optional: Flight/Railway providers
   FLIGHT_API_PROVIDER=amadeus
   AMADEUS_API_KEY=xxxxxxxxxxxxx
   AMADEUS_API_SECRET=xxxxxxxxxxxxx
   RAILWAY_API_PROVIDER=railwayapi.in
   RAILWAY_API_KEY=xxxxxxxxxxxxx
   ```

### Step 2: Deploy the Edge Function

Open terminal and run:

```bash
# Make sure you're in the project directory
cd c:\Users\kapil\OneDrive\Documents\Idiot

# Save secrets (Windows CMD; replace placeholders with your actual keys)
npx supabase secrets set --project-ref boopfwfmuulofecarecx ^
   OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxx" ^
   WEATHER_API_KEY="xxxxxxxxxxxxx" ^
   FLIGHT_API_PROVIDER="amadeus" ^
   AMADEUS_API_KEY="xxxxxxxxxxxxx" ^
   AMADEUS_API_SECRET="xxxxxxxxxxxxx" ^
   RAILWAY_API_PROVIDER="railwayapi.in" ^
   RAILWAY_API_KEY="xxxxxxxxxxxxx"

# Deploy the AI travel planner function
npx supabase functions deploy ai-travel-planner --project-ref boopfwfmuulofecarecx

# Verify deployment
npx supabase functions list --project-ref boopfwfmuulofecarecx
```

### Step 3: Test the Feature

#### Test in Localhost (Development)
1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open browser: http://localhost:5173
3. Log in to your account
4. Click the "AI Travel" tab
5. Test with sample data:
   - **Image URL**: Use any publicly accessible invitation image (e.g., from Imgur, Google Drive with public link)
   - **From City**: Chennai
   - **To City**: Mumbai (or any destination)
6. Click "Analyze Travel Plan"

#### Expected Result:
- The AI will analyze the image
- Check your family calendar for events 2 weeks before/after
- Fetch weather forecast for destination
- Generate travel recommendations
- Send WhatsApp message with full details

## How It Works

### 1. Image Analysis Flow
```
User uploads image URL
   ↓
OpenAI Vision API extracts:
   - Event name
   - Event date
   - Location
   - Occasion type
   - Duration
```

### 2. Schedule Analysis
```
Query family_members table → Get user's families
   ↓
Query events table → Get all events ±14 days from invitation date
   ↓
AI analyzes conflicts and suggests solutions
```

### 3. Weather Forecast
```
Calculate days until event
   ↓
Fetch 14-day forecast from WeatherAPI
   ↓
Extract: temperature, conditions, rain chance
```

### 4. AI Recommendation
```
Combine all data (invitation + conflicts + weather)
   ↓
GPT-4o generates:
   - Best departure date
   - Best return date
   - Conflict resolution strategies
   - Weather-based advice
   - Convenience score (1-10)
```

### 5. WhatsApp Notification
```
Format message with emojis and structure
   ↓
Call send-whatsapp-reminder function
   ↓
User receives formatted travel plan on WhatsApp
```

## Usage Examples

### Example 1: No Conflicts
**Input:**
- Wedding invitation for Dec 15, 2024 in Mumbai
- No family events during Dec 1-29

**Output:**
```
🎉 New Event Invitation Analyzed!

📅 Event: Rahul & Priya's Wedding
📍 Location: Mumbai Grand Hotel
🗓️ Date: Sunday, December 15, 2024

✈️ Travel Recommendation:
Depart: Dec 14
Return: Dec 16
Convenience Score: 9/10

✅ No schedule conflicts! You're free during these dates.

🌤️ Weather: Partly cloudy with pleasant temperature (22°C). 
Light jacket recommended for evenings.

📋 Summary:
Perfect timing for this wedding. No conflicts with your family 
calendar. Weather will be comfortable for outdoor events. Consider 
booking flights early for better prices.

_Family Calendar AI Assistant_
```

### Example 2: With Conflicts
**Input:**
- Birthday party invitation for Jan 20, 2024 in Delhi
- Kid's school function on Jan 19 in Chennai

**Output:**
```
🎉 New Event Invitation Analyzed!

📅 Event: Amit's 40th Birthday
📍 Location: Delhi Convention Center
🗓️ Date: Saturday, January 20, 2024

✈️ Travel Recommendation:
Depart: Jan 20 (morning)
Return: Jan 21
Convenience Score: 6/10

⚠️ Schedule Conflicts:
1. Kids' Annual Day function on Jan 19 at 6 PM in Chennai

💡 Solutions:
1. Attend school function, take early morning flight Jan 20 (6 AM)
2. Consider video call option for school event if birthday is priority
3. Check with spouse - one parent at school, other at birthday

🌤️ Weather: Cool and clear in Delhi (15°C). Minimal rain chance. 
Pack warm clothes for evening outdoor activities.

📋 Summary:
Tight schedule but manageable with morning travel. School function 
ends 8 PM, giving you enough rest before early flight. Birthday 
party starts 7 PM, so you'll arrive with time to spare.

_Family Calendar AI Assistant_
```

## Cost Estimates

### Per Invitation Analysis:
- **OpenAI API**: $0.01-0.03 (GPT-4o with vision)
- **Weather API**: Free (within limits)
- **Twilio WhatsApp**: $0.005 per message (sandbox is free for testing)

### Monthly Estimates (assuming 10 invitations/month):
- OpenAI: ~$0.30
- Weather: $0 (free tier)
- Twilio: $0.05 or $0 (sandbox)
- **Total**: ~$0.35/month for light usage

## Troubleshooting

### Error: "OpenAI API key not configured"
**Solution**: Add `OPENAI_API_KEY` to Supabase Edge Functions secrets

### Error: "Could not parse invitation details from image"
**Causes**:
- Image URL is not publicly accessible
- Image is too low quality
- Image doesn't contain invitation text

**Solutions**:
- Use high-resolution images (minimum 800x600px)
- Ensure image URL is direct link (ends in .jpg, .png, etc.)
- Test with a clear, text-based invitation

### Weather forecast shows "unavailable"
**Causes**:
- Weather API key not configured
- Event is more than 14 days away
- Invalid city name

**Solutions**:
- Add `WEATHER_API_KEY` to Supabase secrets
- Use standard city names (avoid abbreviations)
- For distant events, AI will skip weather analysis

### WhatsApp message not received
**Cause**: Still using Twilio sandbox mode

**Solution**: Refer to `WHATSAPP_SETUP_GUIDE.md` for production setup

### No family events found
**Causes**:
- User not part of any family
- No events created in calendar
- Events outside the ±14 day window

**Solutions**:
- Join or create a family
- Add some events to test properly
- Adjust date range in code if needed (lines 148-156 in index.ts)

## Advanced Configuration

### Change Analysis Window (Default: ±14 days)
Edit `supabase/functions/ai-travel-planner/index.ts`:

```typescript
// Line 148-156
const startDate = new Date(eventDate);
startDate.setDate(startDate.getDate() - 14); // Change -14 to -30 for wider window
const endDate = new Date(eventDate);
endDate.setDate(endDate.getDate() + 14); // Change +14 to +30
```

### Customize AI Prompt
Edit `supabase/functions/ai-travel-planner/index.ts`:

```typescript
// Line 214-245: Modify the prompt template
const prompt = `You are a smart travel planning assistant...`;
```

### Add More Data Sources
You can extend the function to include:
- Flight price APIs (Skyscanner, Google Flights)
- Hotel availability (Booking.com API)
- Traffic/transport data (Google Maps API)

## API Documentation

### Endpoint
```
POST https://boopfwfmuulofecarecx.supabase.co/functions/v1/ai-travel-planner
```

### Request Body
```json
{
  "user_id": "uuid",
  "invitation_image_url": "https://example.com/invitation.jpg",
  "from_city": "Chennai",
  "to_city": "Mumbai"
}
```

### Response
```json
{
  "success": true,
  "invitation": {
    "event_name": "Wedding Celebration",
    "event_date": "2024-12-15",
    "location": "Mumbai Grand Hotel",
    "occasion": "wedding",
    "duration_days": 2
  },
  "suggestions": {
    "recommended_departure": "2024-12-14",
    "recommended_return": "2024-12-16",
    "conflicts": [],
    "conflict_solutions": [],
    "weather_advice": "Pleasant weather expected, 22°C",
    "overall_recommendation": "Perfect timing...",
    "convenience_score": 9
  },
  "message_sent": true
}
```

## Security Considerations

1. **API Keys**: Never commit API keys to git
2. **Image URLs**: Validate URLs before sending to OpenAI
3. **Rate Limiting**: Consider adding rate limits for production
4. **User Privacy**: Invitation images are sent to OpenAI (review their privacy policy)

## Future Enhancements

Planned features for future updates:
- ✅ Image recognition (DONE)
- ✅ Calendar conflict detection (DONE)
- ✅ Weather forecast (DONE)
- ✅ WhatsApp notifications (DONE)
- ⏳ Flight price suggestions
- ⏳ Hotel recommendations
- ⏳ Automatic event creation from invitation
- ⏳ Multi-language support for invitations
- ⏳ Voice input for travel preferences

## Testing Checklist

Before using in production:

- [ ] OpenAI API key added to Supabase secrets
- [ ] Weather API key added to Supabase secrets
- [ ] Edge function deployed successfully
- [ ] Tested with sample invitation image
- [ ] Verified WhatsApp message received
- [ ] Tested with family calendar conflicts
- [ ] Tested with events outside 14-day window
- [ ] Checked cost estimates align with budget
- [ ] Reviewed OpenAI privacy policy
- [ ] Set up billing alerts on OpenAI dashboard

## Support

If you encounter issues:
1. Check Supabase Edge Functions logs: Settings → Edge Functions → Logs
2. Check browser console for frontend errors
3. Verify all API keys are correctly configured
4. Test each component individually (image parsing, weather, calendar)

## Need Help?

Common resources:
- OpenAI API Docs: https://platform.openai.com/docs
- WeatherAPI Docs: https://www.weatherapi.com/docs/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Twilio WhatsApp: https://www.twilio.com/docs/whatsapp

---

**Note**: This is a powerful AI feature. Start with sandbox/testing mode before deploying to production. Monitor API costs carefully, especially OpenAI usage.
