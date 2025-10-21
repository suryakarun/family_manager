import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all users with recurring events
    const { data: users } = await supabaseClient
      .from("profiles")
      .select("id, phone_number, full_name")
      .not("phone_number", "is", null);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with phone numbers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messagesSent = 0;

    for (const user of users) {
      // Get AI suggestion for this user
      const aiResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-event-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            userId: user.id,
            type: "smart_reminder",
          }),
        }
      );

      if (!aiResponse.ok) continue;

      const aiData = await aiResponse.json();
      if (!aiData.success || !aiData.suggestion) continue;

      // Queue the WhatsApp message
      await supabaseClient.from("reminder_queue").insert({
        user_id: user.id,
        phone_number: user.phone_number,
        message: `👋 Hi ${user.full_name || "there"}!\n\n${aiData.suggestion}\n\n_Family Calendar AI Assistant_`,
        scheduled_for: new Date().toISOString(),
        status: "pending",
      });

      messagesSent++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        messagesSent,
        message: `Sent ${messagesSent} smart reminder messages`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
