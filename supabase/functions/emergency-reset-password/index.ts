import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Emergency reset requested for: ${email}`)

    // Resolve user by email via profiles, then verify in auth
    const { data: profileRow, error: profileLookupError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (profileLookupError) {
      console.error('Error looking up profile by email:', profileLookupError)
      return new Response(JSON.stringify({ error: 'Error looking up user by email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!profileRow) {
      console.error('User not found in profiles:', email)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: gotrueUser, error: getByIdError } = await supabaseClient.auth.admin.getUserById(profileRow.id)

    if (getByIdError || !gotrueUser?.user) {
      console.error('User not found in auth:', email, getByIdError)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userToUpdate = gotrueUser.user

    // Verify user has admin_master role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userToUpdate.id)
      .eq('role', 'admin_master')
      .maybeSingle()

    if (roleError) {
      console.error('Error fetching user role:', roleError)
      return new Response(JSON.stringify({ error: 'Error verifying user role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!userRole) {
      console.error('User is not admin_master:', email)
      return new Response(JSON.stringify({ error: 'Only admin_master accounts can use emergency reset' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update user password
    const { data, error } = await supabaseClient.auth.admin.updateUserById(
      userToUpdate.id,
      { password }
    )

    if (error) {
      console.error('Error updating password:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Password successfully updated for: ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password updated for ${email}` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
