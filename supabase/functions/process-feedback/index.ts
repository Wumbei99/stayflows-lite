import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  try {
    const payload = await req.json();
    // This expects a Database Webhook payload for INSERT on in_house_feedback
    const record = payload.record;

    if (!record || record.rating > 3) {
      return new Response(JSON.stringify({ message: "No action needed" }), { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch hotel settings to get managerEmail
    const { data: settings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('profile')
      .eq('tenant_id', record.tenant_id)
      .single();

    if (settingsError || !settings) {
      throw new Error("Could not fetch hotel settings");
    }

    const feedbackEmail = settings.profile?.feedback_email || settings.profile?.manager_email || settings.profile?.managerEmail;

    if (feedbackEmail) {
      // Fire internal email to manager immediately
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "GuestPulse Alerts <notifications@stay-flows.com>",
          to: feedbackEmail,
          subject: `🚨 URGENT: Low Rating Alert (Room ${record.room_number})`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background-color: #f87171; color: white; border-radius: 8px;">
              <h2 style="margin-top: 0;">Urgent: Low Guest Rating</h2>
              <p>A guest in room <strong>${record.room_number}</strong> just left a rating of <strong>${record.rating}/5</strong>.</p>
              <p><strong>Category:</strong> ${record.category || 'General'}</p>
              <p><strong>Message:</strong> ${record.message || 'No message provided'}</p>
              <hr style="border-top: 1px solid white; margin-top: 20px; margin-bottom: 20px;" />
              <p>Please investigate and resolve this issue immediately to prevent negative public reviews.</p>
            </div>
          `
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
