import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse auth header to make sure the requester is a Super Admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get post body: { email, password, tenant_id, role }
    const { email, password, tenant_id, role = 'manager' } = await req.json()

    if (!email || !password || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing email, password, or tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (role !== 'manager' && role !== 'receptionist') {
      return new Response(JSON.stringify({ error: 'Invalid role. Must be manager or receptionist' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authorization check: Super Admin or Tenant Manager
    let isAuthorized = false

    // 1. Check if user is in platform_admins
    const { data: adminData } = await supabaseClient
      .from('platform_admins')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (adminData) {
      isAuthorized = true
    } else {
      // 2. Check if requester is a manager of this tenant
      const { data: tenantUser } = await supabaseClient
        .from('tenant_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('role', 'manager')
        .single()

      if (tenantUser) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Forbidden: Unauthorized to manage users for this tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create the user in Auth
    const { data: authUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email so they don't get blocked
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Add user to tenant_users table as requested role
    const { error: relationError } = await supabaseClient
      .from('tenant_users')
      .insert({
        user_id: authUser.user.id,
        tenant_id,
        role: role,
        email: email
      })

    if (relationError) {
      // If we failed to link them to the tenant, let's delete the auth user to keep state clean
      await supabaseClient.auth.admin.deleteUser(authUser.user.id)
      return new Response(JSON.stringify({ error: `Failed to associate user with tenant: ${relationError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, user_id: authUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
