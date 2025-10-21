# 🚀 Quick Command Reference

## Testing Right Now

```bash
# Start development server
npm run dev

# Open in browser
# http://localhost:5173
```

## Build for Android

```bash
# Full rebuild sequence
npm run build
npx cap sync android

# Then in Android Studio:
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

## Deploy AI Travel Feature (Optional)

```bash
# Deploy Edge Function to Supabase
npx supabase functions deploy ai-travel-planner --project-ref boopfwfmuulofecarecx

# Check deployed functions
npx supabase functions list --project-ref boopfwfmuulofecarecx
```

## Useful Commands

```bash
# Check installed packages
npm list @capacitor/preferences

# Force sync Android
npx cap sync android --force

# Clean build
rm -rf node_modules dist
npm install
npm run build

# Check for errors
npm run build
```

## File Locations

**APK Output:**
```
android\app\build\outputs\apk\debug\app-debug.apk
```

**Environment Variables:**
```
.env (project root)
```

**Edge Functions:**
```
supabase\functions\ai-travel-planner\index.ts
```

## Supabase Links

**Dashboard:**
```
https://supabase.com/dashboard/project/boopfwfmuulofecarecx
```

**Edge Functions Logs:**
```
Dashboard → Edge Functions → Logs
```

**Secrets:**
```
Dashboard → Settings → Edge Functions → Environment Variables
```

## API Keys Needed (Optional)

**OpenAI API:**
- https://platform.openai.com/api-keys
- Add to Supabase: `OPENAI_API_KEY`

**Weather API:**
- https://www.weatherapi.com/signup.aspx
- Add to Supabase: `WEATHER_API_KEY`

## Troubleshooting

**Build fails:**
```bash
npm install
npm run build
```

**Session not persisting:**
- Check `@capacitor/preferences` installed
- Rebuild APK after code changes

**Invite links still localhost:**
- Check `.env` has `VITE_APP_URL`
- Rebuild after changing `.env`

**AI Travel not working:**
- Add API keys to Supabase
- Deploy Edge Function
- Check browser console for errors

## Documentation Files

- **START_HERE.md** - Quick start guide
- **COMPLETE_STATUS.md** - Detailed status report
- **AI_TRAVEL_SETUP.md** - AI Travel setup guide
- **WHATSAPP_SETUP_GUIDE.md** - WhatsApp troubleshooting
- **WHATSAPP_REACTIONS_SETUP.md** - Reactions implementation
- **ENV_SETUP.md** - Environment variables

## Status

✅ All fixes applied
✅ AI Travel feature coded
✅ Documentation complete
✅ TypeScript errors fixed
✅ Ready for testing

**Next:** Test in localhost, then rebuild APK!
