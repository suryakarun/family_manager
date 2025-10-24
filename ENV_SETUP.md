# Environment Variables

## Required for Production

Add these to your `.env` file:

```
# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# App URL (for invite links - use your deployed domain)
VITE_APP_URL=https://familycalend.netlify.app/
```

## For Local Development

```
VITE_APP_URL=http://localhost:5173
```

## After updating .env

1. Rebuild the app:
```cmd
npm run build
```

2. Sync to Android:
```cmd
npx cap copy android
```

3. Rebuild APK in Android Studio or:
```cmd
android\gradlew.bat assembleDebug
```
