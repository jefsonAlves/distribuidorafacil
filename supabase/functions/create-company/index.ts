import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { validateRequest, generateSlug } from "./validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Create company request received:', { email: body.email, companyName: body.companyName });

    // Validar request
    const validated = validateRequest(body);
    console.log('Request validated successfully');

    // Verificar CNPJ único
    const { data: existingTenant, error: tenantCheckError } = await supabase
      .from('tenants')
      .select('id')
      .eq('cnpj', validated.cnpj)
      .maybeSingle();

    if (tenantCheckError) {
      console.error('Error checking CNPJ:', tenantCheckError);
      throw new Error('Erro ao verificar CNPJ');
    }

    if (existingTenant) {
      console.log('CNPJ already exists');
      throw new Error('CNPJ já cadastrado');
    }

    // Verificar email único
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      console.error('Error checking email:', userCheckError);
      throw new Error('Erro ao verificar email');
    }

    const emailExists = existingUser.users.some(u => u.email === validated.email);
    if (emailExists) {
      console.log('Email already exists');
      throw new Error('Email já cadastrado');
    }

    // Criar usuário no Auth
    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
      user_metadata: {
        full_name: validated.fullName,
        user_type: 'company',
        phone: validated.phone,
        company_name: validated.companyName,
        cnpj: validated.cnpj,
      }
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      throw new Error(authError?.message || 'Erro ao criar usuário');
    }

    const userId = authData.user.id;
    console.log('Auth user created:', userId);

    // Gerar slug único
    let slug = generateSlug(validated.companyName);
    let slugSuffix = 1;
    let slugUnique = false;

    while (!slugUnique) {
      const { data: existingSlug } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!existingSlug) {
        slugUnique = true;
      } else {
        slug = `${generateSlug(validated.companyName)}-${slugSuffix}`;
        slugSuffix++;
      }
    }

    console.log('Generated unique slug:', slug);

    // Criar tenant
    console.log('Creating tenant...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: validated.companyName,
        cnpj: validated.cnpj,
        email: validated.email,
        phone: validated.phone,
        slug: slug,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant error:', tenantError);
      // Rollback: deletar usuário criado
      await supabase.auth.admin.deleteUser(userId);
      throw new Error('Erro ao criar empresa');
    }

    console.log('Tenant created:', tenant.id);

    // Criar profile
    console.log('Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: validated.email,
        full_name: validated.fullName,
        phone: validated.phone,
        user_type: 'company',
        tenant_id: tenant.id,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Rollback
      await supabase.from('tenants').delete().eq('id', tenant.id);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error('Erro ao criar perfil');
    }

    console.log('Profile created');

    // Criar role company_admin
    console.log('Creating role...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'company_admin',
      });

    if (roleError) {
      console.error('Role error:', roleError);
      // Rollback
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.from('tenants').delete().eq('id', tenant.id);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error('Erro ao criar permissão');
    }

    console.log('Role created');

    // tenant_features será criado automaticamente via trigger

    console.log('Company created successfully:', tenant.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Empresa cadastrada com sucesso',
        data: {
          tenantId: tenant.id,
          slug: slug,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );

  } catch (error) {
    console.error('Error in create-company function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar empresa'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
