import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set")
    }

    // 1. Fetch all pending messages that are due
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('crm_scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })

    if (fetchError) throw new Error(`Failed to fetch queue: ${fetchError.message}`)

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending messages to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      })
    }

    console.log(`[CRM Queue] Found ${pendingMessages.length} messages to process`)
    let sentCount = 0
    let failCount = 0

    for (const msg of pendingMessages) {
      try {
        // 2. Fetch hotel settings
        const { data: settings } = await supabase
          .from('hotel_settings')
          .select('profile')
          .eq('tenant_id', msg.tenant_id)
          .single()

        const profile = settings?.profile || {}
        const hotelName = profile.hotel_name || 'Your Hotel'

        // 3. Fetch the template for this message type
        const { data: template } = await supabase
          .from('crm_templates')
          .select('*')
          .eq('tenant_id', msg.tenant_id)
          .eq('name', msg.message_type)
          .single()

        const subject = template?.subject || 'How is your stay so far?'
        let body = template?.body || 'We hope you are enjoying your stay! We would love to hear how things are going.'

        // Personalize the body
        const guestName = msg.guest_name || 'Guest'
        if (body.includes('{{guest_name}}')) {
          body = body.replace(/\{\{guest_name\}\}/g, guestName)
        }
        const formattedBody = body.replace(/\n/g, '<br />')

        // 4. Build the feedback link
        const feedbackLink = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'https://your-domain.com'}/guest-feedback?t=${msg.tenant_id}&r=${msg.room_number}`

        // 5. Construct the email
        const gLogo = `<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/24px-Google_%22G%22_Logo.svg.png" width="18" height="18" style="vertical-align: middle; margin-right: 8px; border-radius: 50%; background: white; padding: 2px;" alt="G" />`
        
        const googleReviewButton = profile.google_review_link 
          ? `<a href="${profile.google_review_link}" style="display: block; margin-bottom: 12px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 20px; border-radius: 12px; font-size: 16px; text-align: center;">${gLogo} Leave Us a Review on Google</a>` 
          : ''

        const htmlEmail = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background-color: #0f172a; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${hotelName}</h1>
              </div>
              
              <!-- Body -->
              <div style="padding: 40px 30px; text-align: center;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">${subject}</h2>
                
                <p style="color: #334155; font-size: 16px; font-weight: 500; line-height: 1.6; margin-bottom: 30px; text-align: left;">
                  Hi ${guestName},<br/><br/>
                  ${formattedBody}
                </p>

                <!-- Primary CTA: Give Feedback -->
                <a href="${feedbackLink}" style="display: block; margin-bottom: 16px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 16px 20px; border-radius: 12px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                  ✨ Share Your Experience
                </a>

                <p style="color: #94a3b8; font-size: 13px; margin-bottom: 24px;">Tap the button above to let us know how we're doing</p>

                <!-- Google Review Button -->
                ${googleReviewButton}

                <p style="color: #64748b; font-size: 14px; margin-top: 24px; line-height: 1.5; text-align: left;">
                  <em>You can also scan the QR code in your room at any time to chat directly with us or request services.</em>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Powered by Micro SaaS Hospitality</p>
              </div>
              
            </div>
          </div>
        `

        // 6. Send via Resend
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: `"${hotelName}" <hello@stay-flows.com>`,
            to: msg.guest_email,
            subject: subject,
            html: htmlEmail
          })
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Resend API Error: ${errorText}`)
        }

        // 7. Mark as sent
        await supabase
          .from('crm_scheduled_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msg.id)

        // 8. Also log it in crm_logs for the dashboard
        await supabase.from('crm_logs').insert({
          tenant_id: msg.tenant_id,
          guest_email: msg.guest_email,
          guest_name: msg.guest_name,
          template_name: msg.message_type,
          status: 'sent'
        })

        console.log(`[CRM Queue] ✅ Sent ${msg.message_type} email to ${msg.guest_email} (Room ${msg.room_number})`)
        sentCount++
      } catch (msgError) {
        console.error(`[CRM Queue] ❌ Failed for ${msg.guest_email}:`, msgError.message)
        
        // Mark as failed
        await supabase
          .from('crm_scheduled_messages')
          .update({ status: `failed: ${msgError.message}` })
          .eq('id', msg.id)

        failCount++
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${pendingMessages.length} messages. Sent: ${sentCount}, Failed: ${failCount}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[CRM Queue] Fatal error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    })
  }
})
