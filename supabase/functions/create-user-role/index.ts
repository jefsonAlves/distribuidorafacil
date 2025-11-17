import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Verificar se já tem role
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário já possui role',
          roles: existingRoles.map(r => r.role)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar profile para determinar o tipo de usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      // Se não tem profile, criar como client
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Role client criada com sucesso',
          role: 'client'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar role baseado no user_type
    let roleToCreate = 'client'; // padrão
    
    if (profile.user_type === 'company') {
      roleToCreate = 'company_admin';
    } else if (profile.user_type === 'driver') {
      roleToCreate = 'driver';
    } else {
      roleToCreate = 'client';
    }

    // Criar role usando service role (bypass RLS)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: roleToCreate });

    if (roleError) {
      // Tentar com upsert em caso de conflito
      const { error: upsertError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: roleToCreate }, { onConflict: 'user_id,role' });

      if (upsertError) {
        throw upsertError;
      }
    }

    // Verificar se foi criada
    const { data: createdRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', roleToCreate)
      .maybeSingle();

    if (!createdRole) {
      throw new Error('Falha ao verificar criação da role');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Role ${roleToCreate} criada com sucesso`,
        role: roleToCreate
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user-role function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar role'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

