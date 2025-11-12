import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenantId, resourceType } = await req.json();

    if (!tenantId || !resourceType) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and resource_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar resourceType
    const validTypes = ['drivers', 'clients', 'products'];
    if (!validTypes.includes(resourceType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid resource_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar features do tenant
    const { data: features, error: featuresError } = await supabase
      .from('tenant_features')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (featuresError) {
      console.error('Error fetching features:', featuresError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tenant features' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar uso atual
    const { count, error: countError } = await supabase
      .from(resourceType)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (countError) {
      console.error('Error counting resources:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to count resources' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar o limite baseado no tipo de recurso
    const limitKey = `max_${resourceType}` as keyof typeof features;
    const limit = features[limitKey] as number;
    const currentCount = count || 0;
    const canProceed = currentCount < limit;

    console.log(`Validation for ${resourceType}:`, {
      tenant_id: tenantId,
      current: currentCount,
      limit,
      can_proceed: canProceed,
    });

    return new Response(
      JSON.stringify({
        allowed: canProceed,
        current: currentCount,
        limit,
        remaining: Math.max(0, limit - currentCount),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-tenant-limits:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
