import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import { createDriverSchema } from './validation.ts'

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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validar entrada com Zod
    const body = await req.json()
    const validationResult = createDriverSchema.safeParse(body)

    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Dados inválidos',
        details: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { 
      email, 
      password, 
      full_name, 
      phone, 
      cpf, 
      vehicle, 
      plate, 
      tenant_id 
    } = validationResult.data

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'company_admin')
      .maybeSingle()

    if (roleError || !userRole || profile.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ error: 'Only company admins can create drivers' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        user_type: 'driver',
        phone,
        cpf,
        vehicle,
      },
    })

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || 'Error creating user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Criar ou atualizar profile (SEM campo role - role está em user_roles)
    const { error: profileUpdateError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email,
        full_name: full_name,
        phone: phone,
        cpf: cpf,
        tenant_id: tenant_id,
        user_type: 'driver',
      }, {
        onConflict: 'id'
      })

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError)
      return new Response(JSON.stringify({ error: 'Error creating profile: ' + profileUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: driver, error: driverError } = await supabaseClient
      .from('drivers')
      .insert({
        user_id: newUser.user.id,
        tenant_id,
        name: full_name,
        cpf,
        phone,
        vehicle,
        plate: plate || null,
        status: 'INACTIVE',
      })
      .select()
      .single()

    if (driverError) {
      const { data: existingDriver } = await supabaseClient
        .from('drivers')
        .select('id')
        .eq('user_id', newUser.user.id)
        .maybeSingle()

      if (existingDriver) {
        const { error: updateError } = await supabaseClient
          .from('drivers')
          .update({
            tenant_id,
            name: full_name,
            cpf,
            phone,
            vehicle,
            plate: plate || null,
          })
          .eq('id', existingDriver.id)

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            driver_id: existingDriver.id,
            message: 'Driver created successfully' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } else {
        return new Response(JSON.stringify({ error: driverError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'driver',
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({ 
        success: true, 
        driver_id: driver?.id,
        message: 'Driver created successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
