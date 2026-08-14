import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let log_id_for_error: string | null = null

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Expected Payload from Database Webhook: { type: 'INSERT', record: { id: 'uuid', ... } }
    // Or direct call: { "log_id": "uuid" }
    const payload = await req.json()
    const log_id = payload.record?.id || payload.log_id
    log_id_for_error = log_id

    if (!log_id) {
      throw new Error("Missing log_id or record.id in payload")
    }

    // 1. Fetch the CRM log entry
    const { data: log, error: logError } = await supabaseClient
      .from('crm_logs')
      .select('*, tenants(name)')
      .eq('id', log_id)
      .single()

    if (logError || !log) throw new Error("Log not found")
    
    // 2. Fetch the corresponding template
    const { data: template, error: tplError } = await supabaseClient
      .from('crm_templates')
      .select('*')
      .eq('tenant_id', log.tenant_id)
      .eq('name', log.template_name)
      .single()

    if (tplError || !template) throw new Error("Template not found for this log")

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables")
    }

    // Fetch hotel settings for profile links
    const { data: settings } = await supabaseClient
      .from('hotel_settings')
      .select('profile')
      .eq('tenant_id', log.tenant_id)
      .single()
      
    const profile = settings?.profile || {}

    // 3. Send the Email using Resend
    console.log(`[EMAIL DISPATCH] Sending to ${log.guest_email} via Resend. Subject: ${template.subject}`)
    
    // Construct the HTML Email Frame
    let formattedMessage = template.body.replace(/\n/g, '<br />')
    // Prioritize the name from hotel_settings (which the user can edit) over the immutable tenant name
    const hotelName = profile.hotel_name || log.tenants?.name || 'Your Hotel'
    
    // Personalize with guest name
    const guestName = log.guest_name || 'Guest'
    if (formattedMessage.includes('{{guest_name}}')) {
      formattedMessage = formattedMessage.replace(/\{\{guest_name\}\}/g, guestName)
    } else {
      // If the template doesn't explicitly use the variable, automatically add a greeting
      formattedMessage = `Hi ${guestName},<br/><br/>${formattedMessage}`
    }
    
    let actionButtons = ''
    
    if (log.template_name === 'checkout_thanks') {
      const gLogo = `<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/24px-Google_%22G%22_Logo.svg.png" width="18" height="18" style="vertical-align: middle; margin-right: 8px; border-radius: 50%; background: white; padding: 2px;" alt="G" />`
      const bLogo = `<img src="https://cf.bstatic.com/static/img/b25logo/booking_icon_retina/63c5a6976f6259ce3ebcde11ff1bf77bb0b537be.png" width="18" height="18" style="vertical-align: middle; margin-right: 8px;" alt="B" />`
      
      const gReview = profile.google_review_link ? `<a href="${profile.google_review_link}" style="display: block; margin-bottom: 16px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 20px; border-radius: 12px; font-size: 16px;">${gLogo}Leave a Google Review</a>` : ''
      const oReview = profile.ota_review_link ? `<a href="${profile.ota_review_link}" style="display: block; margin-bottom: 24px; background-color: #003b95; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 20px; border-radius: 12px; font-size: 16px;">${bLogo}Review on Booking.com</a>` : ''
      
      const fb = profile.facebook_url ? `<a href="${profile.facebook_url}" style="color: #2563eb; text-decoration: none; font-weight: bold; margin: 0 10px;">Facebook</a>` : ''
      const ig = profile.instagram_url ? `<a href="${profile.instagram_url}" style="color: #db2777; text-decoration: none; font-weight: bold; margin: 0 10px;">Instagram</a>` : ''
      const tw = profile.twitter_url ? `<a href="${profile.twitter_url}" style="color: #0284c7; text-decoration: none; font-weight: bold; margin: 0 10px;">Twitter/X</a>` : ''
      
      actionButtons = `
        ${gReview}
        ${oReview}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px; margin-bottom: 15px;">Follow us online</p>
          <div>${fb} ${ig} ${tw}</div>
        </div>
      `
    } else {
      actionButtons = `
        <a href="https://your-domain.com/guest-feedback?t=${log.tenant_id}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 16px 32px; border-radius: 12px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          Tap Here for Room Service & Assistance
        </a>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px; line-height: 1.5;">
          <em>Tip: You can also scan the QR code located in your room to access these services and speak directly with management from your phone.</em>
        </p>
      `
    }
    
    const htmlEmail = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background-color: #0f172a; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${hotelName}</h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">${template.subject}</h2>
            
            <p style="color: #334155; font-size: 16px; font-weight: 500; line-height: 1.6; margin-bottom: 40px; text-align: left;">
              ${formattedMessage}
            </p>
            
            ${actionButtons}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Powered by Micro SaaS Hospitality</p>
          </div>
          
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `"${hotelName}" <hello@stay-flows.com>`, 
        to: log.guest_email,
        subject: template.subject,
        html: htmlEmail
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Resend API Error: ${errorText}`)
    }
    
    // 4. Update the log status to 'sent'
    await supabaseClient
      .from('crm_logs')
      .update({ status: 'sent' })
      .eq('id', log_id)

    return new Response(
      JSON.stringify({ message: `Email sent to ${log.guest_email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    if (log_id_for_error) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseClient
        .from('crm_logs')
        .update({ status: `Failed: ${error.message}` })
        .eq('id', log_id_for_error)
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
