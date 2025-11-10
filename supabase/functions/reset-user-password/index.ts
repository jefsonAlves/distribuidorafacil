import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import { resetPasswordSchema } from './validation.ts'

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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Check if user is admin_master using user_roles table
    // Use SECURITY DEFINER function has_role() for secure role checking
    const { data: hasRole, error: roleError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin_master'
      })

    if (roleError || !hasRole) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin master only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Validar entrada com Zod
    const body = await req.json()
    const validationResult = resetPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Dados inválidos',
        details: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const { email, password } = validationResult.data

    // Get user by email
    const { data: targetUser, error: getUserError } = await supabaseClient.auth.admin.listUsers()
    
    if (getUserError) {
      return new Response(JSON.stringify({ error: getUserError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const userToUpdate = targetUser.users.find(u => u.email === email)
    
    if (!userToUpdate) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // Update user password
    const { data, error } = await supabaseClient.auth.admin.updateUserById(
      userToUpdate.id,
      { password }
    )

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password updated for ${email}` 
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
