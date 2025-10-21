import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, message, send_at } = await req.json();

    if (!user_id || !message || !send_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, message, send_at" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's phone from profiles to verify user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user_id)
      .single();

    if (userError || !user || !user.phone) {
      console.error("User phone fetch error:", userError);
      return new Response(
        JSON.stringify({ error: "User not found or no phone number registered" }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert reminder into queue (phone is fetched later by send-whatsapp-reminder)
    const { data, error } = await supabase
      .from("reminder_queue")
      .insert([{
        user_id,
        message,
        send_at: send_at,
        status: "pending"
      }])
      .select()
      .single();

    if (error) {
      console.error("Queue insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to queue reminder", details: error.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reminder queued successfully:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        queued: true,
        reminder: data
      }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
