import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function para corrigir usuários órfãos
 * Busca dados em auth.users e cria registros faltantes em profiles e clients
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
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
    console.log('Iniciando correção para user_id:', userId);

    // Verificar se usuário tem role client
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'client')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuário não possui role de cliente' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do auth.users
    const { data: { user: authUser }, error: authFetchError } = await supabase.auth.admin.getUserById(userId);
    
    if (authFetchError || !authUser) {
      throw new Error('Falha ao buscar dados de autenticação');
    }

    const metadata = authUser.user_metadata || {};
    
    // Buscar tenant_id padrão
    const { data: defaultTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const tenantId = defaultTenant?.id;

    if (!tenantId) {
      throw new Error('Nenhuma empresa ativa encontrada');
    }

    // Criar/atualizar profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: authUser.email!,
        full_name: metadata.full_name || '',
        phone: metadata.phone || '',
        cpf: metadata.cpf || '',
        user_type: metadata.user_type || 'client',
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Erro ao criar profile:', profileError);
      throw profileError;
    }

    // Criar/atualizar client
    const { error: clientError } = await supabase
      .from('clients')
      .upsert({
        user_id: userId,
        email: authUser.email!,
        full_name: metadata.full_name || '',
        phone: metadata.phone || '',
        cpf: metadata.cpf || '',
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (clientError) {
      console.error('Erro ao criar client:', clientError);
      throw clientError;
    }

    console.log('Correção concluída com sucesso para user_id:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados corrigidos com sucesso',
        tenant_id: tenantId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in repair-orphan-user function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao corrigir dados'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
