# 🚀 AI Family Calendar Assistant - Complete Setup Guide

Welcome! This guide will help you set up the complete AI-powered calendar assistant with chat and voice support.

---

## 📋 **Prerequisites**

- ✅ OpenAI API account (get key from https://platform.openai.com/api-keys)
- ✅ Supabase project running
- ✅ Node.js 18+ installed
- ✅ Existing family calendar app working

---

## 🎯 **Step 1: Install Dependencies**

```bash
# Install required packages
npm install framer-motion react-markdown

# Verify installation
npm list framer-motion react-markdown
```

---

## 🗄️ **Step 2: Run Database Migration**

```bash
# Copy migration file to your migrations folder
# File: supabase/migrations/20251103_add_ai_assistant_tables.sql

# Run migration
npx supabase migration up

# Verify tables were created
npx supabase db push
```

**Expected tables:**
- ✅ `ai_conversations`
- ✅ `ai_suggestions`
- ✅ `event_conflicts`

---

## 🔑 **Step 3: Configure OpenAI API Key**

### **Option A: Supabase Edge Function Secrets (Recommended)**

```bash
# Set OpenAI API key for edge function
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here

# Verify secret was set
npx supabase secrets list
```

### **Option B: Local Development**

```bash
# Create/update .env.local
echo "OPENAI_API_KEY=sk-your-openai-api-key-here" >> .env.local
```

---

## 📦 **Step 4: Deploy Edge Function**

```bash
# Navigate to functions directory
cd supabase/functions

# Deploy ai-event-assistant function
npx supabase functions deploy ai-event-assistant

# Test the function
npx supabase functions invoke ai-event-assistant --data '{
  "message": "Test message",
  "mode": "chat",
  "user_id": "test-user-id",
  "family_id": "test-family-id"
}'
```

**Expected response:**
```json
{
  "type": "chat",
  "message": "AI response here",
  "conversation_id": "uuid-here"
}
```

---

## 🎨 **Step 5: Add Frontend Components**

Copy all component files to your project:

```
src/
├── components/
│   ├── AIAssistant.tsx
│   ├── VoiceInput.tsx
│   ├── ChatInterface.tsx
│   ├── ConflictDetector.tsx
│   ├── SmartSuggestions.tsx
│   └── ui/
│       ├── audio-visualizer.tsx
│       └── message-bubble.tsx
├── hooks/
│   ├── use-ai-assistant.ts
│   ├── use-voice-input.ts
│   ├── use-conflict-detection.ts
│   └── use-smart-suggestions.ts
└── types/
    └── ai-assistant.ts
```

---

## 🔗 **Step 6: Integrate into Your App**

### **Dashboard Integration**

```typescript
// src/pages/Dashboard.tsx
import { AIAssistant } from '../components/AIAssistant';

export const Dashboard = () => {
  const { user } = useAuth();
  const { selectedFamilyId } = useFamilyContext();

  return (
    <div>
      {/* Your existing dashboard */}
      
      {/* Add AI Assistant */}
      {user && selectedFamilyId && (
        <AIAssistant
          familyId={selectedFamilyId}
          userId={user.id}
          onEventCreated={(event) => {
            console.log('Event created:', event);
            // Refresh your calendar here
          }}
        />
      )}
    </div>
  );
};
```

---

## ✅ **Step 7: Test the Integration**

### **Test Chat Mode**

1. Open your app
2. Click the AI Assistant button (sparkle icon)
3. Type: "Add a meeting tomorrow at 3 PM"
4. Verify event is created

### **Test Voice Mode**

1. Click the microphone icon
2. Speak: "Create volleyball practice every Monday at 7"
3. Verify transcription and event creation

### **Test Conflict Detection**

1. Create two overlapping events
2. AI should detect the conflict
3. Verify suggested resolutions appear

### **Test Smart Suggestions**

1. Create an event
2. Check if AI provides suggestions
3. Accept/reject suggestions

---

## 🐛 **Troubleshooting**

### **Issue: Edge function fails**

```bash
# Check function logs
npx supabase functions logs ai-event-assistant

# Common fixes:
# 1. Verify OpenAI API key is set
npx supabase secrets list

# 2. Redeploy function
npx supabase functions deploy ai-event-assistant --no-verify-jwt
```

### **Issue: Voice input not working**

**Chrome/Edge:** Allow microphone permissions
**Safari:** Requires HTTPS in production
**Firefox:** Check microphone settings

```javascript
// Test microphone access
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('Mic access granted'))
  .catch(err => console.error('Mic error:', err));
```

### **Issue: Conflicts not detected**

```bash
# Verify function exists
SELECT * FROM detect_event_conflicts('your-family-id', NOW(), NOW() + INTERVAL '1 day');

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'event_conflicts';
```

### **Issue: TypeScript errors**

```bash
# Regenerate types from Supabase
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# Or from remote
npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
```

---

## 🔒 **Security Checklist**

- ✅ OpenAI API key stored in Supabase secrets (not .env)
- ✅ RLS policies enabled on all AI tables
- ✅ Edge function validates user_id matches auth
- ✅ CORS headers properly configured
- ✅ Rate limiting on edge function (100 requests/hour recommended)

---

## 📊 **Performance Optimization**

### **Reduce API Costs**

```typescript
// In edge function, add response caching:
const cacheKey = `ai-response-${message}-${mode}`;
const cached = await supabase
  .from('ai_conversations')
  .select('response')
  .eq('message', message)
  .single();

if (cached) {
  return cached.response;
}
```

### **Optimize Voice Transcription**

```typescript
// Use shorter audio chunks
mediaRecorder.start(100); // 100ms chunks instead of 1000ms
```

---

## 🎨 **Customization**

### **Change AI Personality**

Edit the `SYSTEM_PROMPT` in `ai-event-assistant/index.ts`:

```typescript
const SYSTEM_PROMPT = `
You are a [friendly/professional/casual] Family Calendar AI Assistant.
Your tone should be [warm/formal/playful].
...
`;
```

### **Add Custom Suggestion Types**

```typescript
// In types/ai-assistant.ts
export type SuggestionType = 
  | 'event_improvement'
  | 'your_custom_type' // Add here
  | ...
```

### **Customize UI Colors**

```typescript
// In AIAssistant.tsx
className="bg-gradient-to-r from-indigo-600 to-purple-600"
// Change to your brand colors
className="bg-gradient-to-r from-blue-600 to-cyan-600"
```

---

## 📱 **Mobile App Integration (Capacitor)**

If you're using Capacitor for mobile:

```bash
# Install voice plugins
npm install @capacitor/voice-recognition
```

```typescript
// In use-voice-input.ts
import { VoiceRecognition } from '@capacitor/voice-recognition';

// Use native voice recognition on mobile
if (Capacitor.isNativePlatform()) {
  const result = await VoiceRecognition.recognize();
  return result.transcript;
}
```

---

## 📈 **Monitoring & Analytics**

### **Track AI Usage**

```sql
-- Query AI usage stats
SELECT 
  DATE(created_at) as date,
  mode,
  COUNT(*) as total_messages
FROM ai_conversations
WHERE family_id = 'your-family-id'
GROUP BY DATE(created_at), mode
ORDER BY date DESC;
```

### **Monitor Conflicts**

```sql
-- Track conflict resolution rate
SELECT 
  resolution_status,
  COUNT(*) as count
FROM event_conflicts
WHERE family_id = 'your-family-id'
GROUP BY resolution_status;
```

---

## 🆘 **Getting Help**

**Common Questions:**

**Q: Voice transcription is inaccurate**
A: The demo uses a placeholder. Integrate a real STT service like OpenAI Whisper, Google Speech-to-Text, or Azure Speech.

**Q: How much does OpenAI cost?**
A: GPT-4 Turbo costs ~$0.01-0.03 per message. Budget $10-20/month for moderate use.

**Q: Can I use a different AI model?**
A: Yes! Replace the OpenAI call in the edge function with Claude, Gemini, or local models.

**Q: Does it work offline?**
A: No, requires internet for AI processing. Consider caching responses for common queries.

---

## 🎉 **Next Steps**

1. ✅ Complete setup
2. ✅ Test all features
3. 📝 Read INTEGRATION_GUIDE.md for component integration
4. 🎨 Customize UI to match your brand
5. 📊 Set up monitoring
6. 🚀 Deploy to production

---

## 📚 **Additional Resources**

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Framer Motion](https://www.framer.com/motion/)

---

**🎊 Congratulations!** Your AI Family Calendar Assistant is ready!

Need help? Check the troubleshooting section or review the integration guide.
