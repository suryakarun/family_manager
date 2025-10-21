import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const { user_id, message, send_at } = await req.json();

    if (!user_id || !message || !send_at) {
      return new Response(JSON.stringify({ error: "Missing user_id, message or send_at" }), { status: 400 });
    }

    const resp = await fetch(
      "https://boopfwfmuulofecarecx.supabase.co/functions/v1/queue-reminder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ user_id, message, send_at })
      }
    );

    const data = await resp.json();
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
