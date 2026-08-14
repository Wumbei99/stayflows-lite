import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // We need admin privileges to bypass RLS for webhook writes
    )

    // Expected Payload from a PMS (Property Management System) like Mews or Cloudbeds
    // { "event": "check_in" | "check_out", "tenant_id": "uuid", "room_number": "101", "guest_email": "guest@example.com", "reservation_id": "xyz123" }
    const { event, tenant_id, room_number, guest_email, reservation_id } = await req.json()

    if (!tenant_id || !room_number) {
      throw new Error("Missing required fields: tenant_id or room_number")
    }

    if (event === 'check_in') {
      // 1. Activate the Room (e.g., generate a new secure hash so the old guest's QR code expires)
      const newHash = crypto.randomUUID()
      await supabaseClient
        .from('rooms')
        .update({ qr_code_hash: newHash, status: 'occupied' })
        .eq('tenant_id', tenant_id)
        .eq('room_number', room_number)

      // 2. Log the CRM Event to trigger the Welcome Email
      if (guest_email) {
        await supabaseClient.from('crm_logs').insert({
          tenant_id,
          guest_email,
          template_name: 'Welcome Email',
          status: 'pending'
        })
      }

      return new Response(
        JSON.stringify({ message: `Successfully checked in room ${room_number}. New QR hash generated.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (event === 'check_out') {
      // 1. Deactivate the Room (nullify the hash so the QR code is dead)
      await supabaseClient
        .from('rooms')
        .update({ qr_code_hash: null, status: 'vacant' })
        .eq('tenant_id', tenant_id)
        .eq('room_number', room_number)

      // 2. Clear old chat history for privacy
      await supabaseClient
        .from('guest_messages')
        .delete()
        .eq('tenant_id', tenant_id)
        .eq('room_number', room_number)

      // 3. Log the CRM Event to trigger the 'Thank You / Review' Email
      if (guest_email) {
        await supabaseClient.from('crm_logs').insert({
          tenant_id,
          guest_email,
          template_name: 'Checkout Review',
          status: 'pending'
        })
      }

      return new Response(
        JSON.stringify({ message: `Successfully checked out room ${room_number}. QR code deactivated.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else {
      throw new Error(`Unsupported event type: ${event}`)
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
