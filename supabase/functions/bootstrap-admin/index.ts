import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-maintenance-token',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const maintenanceToken = req.headers.get('x-maintenance-token');
    const expectedToken = Deno.env.get('MAINTENANCE_TOKEN');

    if (!maintenanceToken || maintenanceToken !== expectedToken) {
      console.error('Invalid or missing maintenance token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email and newPassword are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Bootstrap admin request for email: ${email}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string;
    let userExists = false;

    // Tentar atualizar primeiro (assumindo que o usuário existe)
    // Buscar usuário pelo email usando query direta
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    const existingUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
      userExists = true;
      console.log(`User found: ${userId}, updating password...`);

      // Atualizar senha
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }
      console.log('Password updated successfully');
    } else {
      console.log('User not found, creating new user...');
      // Criar novo usuário
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin Master',
          user_type: 'admin_master'
        }
      });

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log(`User created: ${userId}`);
    }

    // Garantir profile existe (sem campo role, pois role está em user_roles)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: 'Admin Master'
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      // Não falhar se profile já existe - apenas continuar
      console.log('Profile error (non-fatal):', profileError);
    }

    // Garantir role admin_master
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin_master'
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Error upserting role:', roleError);
      throw roleError;
    }

    console.log('Admin master bootstrapped successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: userExists ? 'Admin master updated successfully' : 'Admin master created successfully',
        userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bootstrap admin error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
