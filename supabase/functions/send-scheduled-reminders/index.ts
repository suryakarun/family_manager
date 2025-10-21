import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async () => {
  try {
    // Get current time
    const now = new Date().toISOString();

    // Find reminders that are due to be sent (accept both 'pending' and 'ready_to_send')
    const { data: reminders, error } = await supabase
      .from("reminder_queue")
      .select("*")
      .in("status", ["pending", "ready_to_send"])
      .lte("send_at", now)  // send_at is less than or equal to now
      .limit(50);  // Process up to 50 reminders at a time

    if (error) {
      console.error("Error fetching reminders:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      console.log("No reminders to send at this time");
      return new Response(JSON.stringify({ message: "No reminders to send" }), { status: 200 });
    }

    console.log(`Processing ${reminders.length} reminders...`);

    let successCount = 0;
    let failureCount = 0;

    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Mark as processing to avoid duplicate sends
        await supabase
          .from("reminder_queue")
          .update({ status: "processing" })
          .eq("id", reminder.id);

        // Call the send-whatsapp-reminder function
        const sendResponse = await fetch(
          "https://boopfwfmuulofecarecx.supabase.co/functions/v1/send-whatsapp-reminder",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ 
              user_id: reminder.user_id, 
              message: reminder.message 
            })
          }
        );

        const sendResult = await sendResponse.json();

        if (sendResponse.ok && sendResult.success) {
          // Mark as sent
          await supabase
            .from("reminder_queue")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString()
            })
            .eq("id", reminder.id);

          console.log(`✓ Reminder ${reminder.id} sent successfully`);
          successCount++;
        } else {
          throw new Error(sendResult.error || "Failed to send");
        }

      } catch (err: any) {
        console.error(`✗ Failed to send reminder ${reminder.id}:`, err.message);
        
        // Update failure status
        const attempts = (reminder.attempts || 0) + 1;
        await supabase
          .from("reminder_queue")
          .update({ 
            status: attempts >= 3 ? "failed" : "pending",  // Retry up to 3 times
            last_error: err.message, 
            attempts: attempts
          })
          .eq("id", reminder.id);

        failureCount++;
      }
    }

    console.log(`Completed: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failureCount,
        total: reminders.length
      }), 
      { status: 200 }
    );

  } catch (err: any) {
    console.error("Error in send-scheduled-reminders:", err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500 }
    );
  }
});
