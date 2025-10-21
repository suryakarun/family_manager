# WhatsApp Reactions Feature - Implementation Guide

## Overview
Enable family members to react to event photos or RSVPs directly through WhatsApp using emoji reactions (👍, ❤️, 😂, etc.).

## Feature Specification

### What Users Can Do:
1. Receive WhatsApp message when someone posts an event photo
2. Reply with emoji reactions (👍, ❤️, 😂, 🎉, etc.)
3. See reaction counts on photos in the gallery
4. Get real-time updates when others react

### Technical Flow:
```
User posts photo → WhatsApp notification sent to family
   ↓
Family member replies with emoji
   ↓
Twilio webhook receives reaction
   ↓
Supabase Edge Function processes reaction
   ↓
Database updated with reaction
   ↓
Real-time update pushes to all family members
```

## Implementation Steps

### Step 1: Create Reactions Table

Create migration file: `supabase/migrations/20241020_add_photo_reactions.sql`

```sql
-- Create photo_reactions table
CREATE TABLE IF NOT EXISTS public.photo_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL CHECK (reaction IN ('👍', '❤️', '😂', '🎉', '😮', '😢')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(photo_id, user_id, reaction) -- One reaction type per user per photo
);

-- Add indexes for performance
CREATE INDEX idx_photo_reactions_photo_id ON public.photo_reactions(photo_id);
CREATE INDEX idx_photo_reactions_user_id ON public.photo_reactions(user_id);
CREATE INDEX idx_photo_reactions_created_at ON public.photo_reactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reactions in their families"
    ON public.photo_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.event_photos ep
            JOIN public.events e ON ep.event_id = e.id
            JOIN public.family_members fm ON e.family_id = fm.family_id
            WHERE ep.id = photo_reactions.photo_id
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add reactions"
    ON public.photo_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.event_photos ep
            JOIN public.events e ON ep.event_id = e.id
            JOIN public.family_members fm ON e.family_id = fm.family_id
            WHERE ep.id = photo_id
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove their own reactions"
    ON public.photo_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to get reaction counts
CREATE OR REPLACE FUNCTION get_photo_reaction_counts(p_photo_id UUID)
RETURNS TABLE (
    reaction TEXT,
    count BIGINT,
    users JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.reaction,
        COUNT(*)::BIGINT as count,
        jsonb_agg(
            jsonb_build_object(
                'user_id', p.id,
                'full_name', p.full_name,
                'avatar_url', p.avatar_url
            )
        ) as users
    FROM public.photo_reactions pr
    JOIN public.profiles p ON pr.user_id = p.id
    WHERE pr.photo_id = p_photo_id
    GROUP BY pr.reaction
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_photo_reaction_counts TO authenticated;
```

### Step 2: Create Twilio Webhook Handler

Create: `supabase/functions/whatsapp-reaction-handler/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Parse Twilio webhook data
    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";
    
    console.log("Received WhatsApp message:", { from, body });

    // Extract phone number (remove "whatsapp:" prefix)
    const phoneNumber = from.replace("whatsapp:", "");

    // Check if message is a reaction (single emoji or "react [emoji] to photo [id]")
    const emojiRegex = /^(👍|❤️|😂|🎉|😮|😢)$/;
    const reactionMatch = body.match(/react\s+(👍|❤️|😂|🎉|😮|😢)\s+to\s+photo\s+([a-f0-9-]{36})/i);
    
    let emoji: string | null = null;
    let photoId: string | null = null;

    if (emojiRegex.test(body.trim())) {
      // Simple emoji reply - need to find latest photo from context
      emoji = body.trim();
      photoId = await getLatestPhotoForUser(phoneNumber);
    } else if (reactionMatch) {
      // Explicit "react ❤️ to photo abc-123" format
      emoji = reactionMatch[1];
      photoId = reactionMatch[2];
    }

    if (!emoji || !photoId) {
      return new Response("Not a valid reaction", { status: 200 });
    }

    // Find user by phone number
    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phoneNumber)
      .single();

    if (!user) {
      console.log("User not found for phone:", phoneNumber);
      return new Response("User not found", { status: 200 });
    }

    // Add or update reaction
    const { error } = await supabase
      .from("photo_reactions")
      .upsert({
        photo_id: photoId,
        user_id: user.id,
        reaction: emoji,
      }, {
        onConflict: "photo_id,user_id,reaction"
      });

    if (error) {
      console.error("Error adding reaction:", error);
      return new Response("Error adding reaction", { status: 500 });
    }

    // Send confirmation via WhatsApp
    await sendWhatsAppMessage(
      phoneNumber,
      `Reaction ${emoji} added successfully!`
    );

    // Broadcast real-time update
    await supabase
      .from("photo_reactions")
      .select("*")
      .eq("photo_id", photoId);

    return new Response("Reaction processed", { status: 200 });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

async function getLatestPhotoForUser(phoneNumber: string): Promise<string | null> {
  // Get user's latest notified photo from a tracking table
  const { data } = await supabase
    .from("whatsapp_photo_notifications")
    .select("photo_id")
    .eq("recipient_phone", phoneNumber)
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  return data?.photo_id || null;
}

async function sendWhatsAppMessage(to: string, message: string) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: twilioFrom!,
        To: `whatsapp:${to}`,
        Body: message,
      }),
    }
  );

  return await response.json();
}
```

### Step 3: Track WhatsApp Notifications

Create migration: `supabase/migrations/20241020_add_whatsapp_tracking.sql`

```sql
-- Track which photos were sent to which users via WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_photo_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_whatsapp_notifications_phone ON public.whatsapp_photo_notifications(recipient_phone);
CREATE INDEX idx_whatsapp_notifications_sent_at ON public.whatsapp_photo_notifications(sent_at DESC);
```

### Step 4: Update Photo Upload Notification

Modify `supabase/functions/event-listener/index.ts` to include reaction instructions:

```typescript
// When sending WhatsApp notification for new photo
const message = `📸 New photo added to "${eventTitle}"!\n\n` +
  `View it in the family calendar app.\n\n` +
  `React to this photo by replying with:\n` +
  `👍 Like | ❤️ Love | 😂 Funny | 🎉 Celebrate`;

// Track this notification
await supabase.from("whatsapp_photo_notifications").insert({
  photo_id: photoId,
  recipient_phone: user.phone,
});
```

### Step 5: Update Event Gallery Component

Modify `src/components/eventgallery.tsx` to show reactions:

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhotoReaction {
  reaction: string;
  count: number;
  users: Array<{ user_id: string; full_name: string; avatar_url: string }>;
}

export function PhotoWithReactions({ photoId }: { photoId: string }) {
  const [reactions, setReactions] = useState<PhotoReaction[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);

  useEffect(() => {
    fetchReactions();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`photo_reactions:${photoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photo_reactions",
          filter: `photo_id=eq.${photoId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [photoId]);

  const fetchReactions = async () => {
    const { data } = await supabase.rpc("get_photo_reaction_counts", {
      p_photo_id: photoId,
    });

    if (data) {
      setReactions(data);
    }

    // Check if current user has reacted
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userReaction } = await supabase
        .from("photo_reactions")
        .select("reaction")
        .eq("photo_id", photoId)
        .eq("user_id", user.id)
        .maybeSingle();

      setMyReaction(userReaction?.reaction || null);
    }
  };

  const addReaction = async (emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (myReaction === emoji) {
      // Remove reaction if clicking same emoji
      await supabase
        .from("photo_reactions")
        .delete()
        .eq("photo_id", photoId)
        .eq("user_id", user.id)
        .eq("reaction", emoji);
      setMyReaction(null);
    } else {
      // Add new reaction (upsert will replace if exists)
      await supabase.from("photo_reactions").upsert({
        photo_id: photoId,
        user_id: user.id,
        reaction: emoji,
      });
      setMyReaction(emoji);
    }
  };

  return (
    <div className="space-y-2">
      {/* Photo display here */}
      
      {/* Reaction bar */}
      <div className="flex items-center gap-2">
        {["👍", "❤️", "😂", "🎉", "😮", "😢"].map((emoji) => {
          const reactionData = reactions.find((r) => r.reaction === emoji);
          const isActive = myReaction === emoji;

          return (
            <button
              key={emoji}
              onClick={() => addReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <span className="text-lg">{emoji}</span>
              {reactionData && reactionData.count > 0 && (
                <span className="text-xs font-medium">{reactionData.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Show who reacted */}
      {reactions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {reactions.map((r) => (
            <div key={r.reaction}>
              {r.reaction}{" "}
              {r.users.map((u) => u.full_name).join(", ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 6: Configure Twilio Webhook

1. Go to Twilio Console: https://console.twilio.com/
2. Navigate to: Messaging → Settings → WhatsApp Sandbox Settings
3. Set "When a message comes in" webhook:
   ```
   https://boopfwfmuulofecarecx.supabase.co/functions/v1/whatsapp-reaction-handler
   ```
4. Method: POST
5. Click Save

## Deployment

```bash
# 1. Apply database migrations
npx supabase db push --project-ref boopfwfmuulofecarecx

# 2. Deploy Edge Function
npx supabase functions deploy whatsapp-reaction-handler --project-ref boopfwfmuulofecarecx

# 3. Rebuild app
npm run build
npx cap sync android

# 4. Test webhook locally first
npx supabase functions serve whatsapp-reaction-handler
```

## Testing

### Test Reaction Flow:
1. Upload a photo to an event
2. WhatsApp notification should be sent to family members
3. Reply to WhatsApp message with emoji: `❤️`
4. Check app - reaction should appear on photo
5. Other family members see the reaction in real-time

### Test in App:
1. Open event gallery
2. Click reaction emoji below photo
3. Emoji should highlight and count should increase
4. Click same emoji again to remove reaction

## Production Considerations

### Limitations in Sandbox Mode:
- Users must "join" sandbox before reacting
- Limited to 10 sandbox participants
- 24-hour session expiry

### For Production (Twilio Business API):
- No "join" requirement
- Unlimited users
- Persistent sessions
- Costs: ~$0.005 per incoming message

## User Instructions

### How to React via WhatsApp:
**Method 1 (Simple):**
1. Wait for photo notification on WhatsApp
2. Reply with just the emoji: `❤️`

**Method 2 (Explicit):**
1. Reply with: `react ❤️ to photo abc-123`
2. Photo ID shown in notification

### How to React in App:
1. Open event gallery
2. Tap photo to view full size
3. Tap emoji button below photo
4. Tap again to remove reaction

## Troubleshooting

### Reaction not appearing:
- Check user phone number matches their profile
- Verify webhook URL is correct in Twilio
- Check Supabase Edge Functions logs

### Multiple reactions for same user:
- Should not happen due to UNIQUE constraint
- If it does, check database migration applied correctly

### Real-time not working:
- Verify Supabase Realtime is enabled
- Check subscription in browser console
- Ensure RLS policies allow SELECT

## Future Enhancements

- ✅ Basic emoji reactions (DONE in this guide)
- ⏳ Custom emoji reactions
- ⏳ Reaction animations
- ⏳ Reaction notifications ("Sarah reacted ❤️ to your photo")
- ⏳ Most reacted photos section
- ⏳ Reaction analytics

## Cost Estimate

Per 1000 reactions:
- Database operations: Free (within Supabase limits)
- WhatsApp incoming: $5 (production) or $0 (sandbox)
- WhatsApp confirmation: $5 (production) or $0 (sandbox)
- **Total**: ~$10/1000 reactions in production

---

**Status**: Ready for implementation
**Complexity**: Medium
**Estimated Time**: 3-4 hours
