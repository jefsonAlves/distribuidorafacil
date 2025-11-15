import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import { createOrderSchema } from './validation.ts'

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
    const validationResult = createOrderSchema.safeParse(body)

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

    const { tenant_id, client_id, total, payment_method, change_for, address, items } = validationResult.data

    // Verificar se o cliente pertence ao usuário autenticado
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id, user_id, tenant_id')
      .eq('id', client_id)
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: 'Cliente não encontrado ou não pertence ao usuário' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se o cliente pertence ao tenant
    if (client.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ error: 'Cliente não pertence ao tenant especificado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se os produtos pertencem ao tenant e estão ativos
    const productIds = items.map(item => item.product_id)
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, tenant_id, active, price')
      .in('id', productIds)
      .eq('tenant_id', tenant_id)
      .eq('active', true)

    if (productsError || !products || products.length !== productIds.length) {
      return new Response(JSON.stringify({ error: 'Um ou mais produtos não encontrados ou inativos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se os preços estão corretos
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)
      if (!product || parseFloat(product.price) !== item.unit_price) {
        return new Response(JSON.stringify({ error: `Preço do produto ${item.name} não corresponde` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Calcular total novamente para validar
    const calculatedTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
    if (Math.abs(calculatedTotal - total) > 0.01) {
      return new Response(JSON.stringify({ error: 'Total calculado não corresponde ao total enviado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let pix_code = null;
    let pix_expiration = null;
    let pix_qr_code_url = null;

    if (payment_method === 'PIX') {
      // Obter a chave PIX da empresa
      const { data: tenantData, error: tenantError } = await supabaseClient
        .from('tenants')
        .select('pix_key')
        .eq('id', tenant_id)
        .single();

      if (tenantError || !tenantData?.pix_key) {
        return new Response(JSON.stringify({ error: 'Chave PIX da empresa não configurada.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const companyPixKey = tenantData.pix_key;

      // TODO: Integrar com API de PIX para gerar QR Code e código
      // Por enquanto, simulamos com dados fictícios
      const uniquePixId = crypto.randomUUID(); // Usar um ID único para o PIX
      pix_code = `pix-${uniquePixId}-${total.toFixed(2).replace('.', '')}`;
      pix_expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutos de expiração
      pix_qr_code_url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pix_code)}`; // Exemplo de QR Code
    }

    // Criar pedido
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        tenant_id,
        client_id,
        total,
        payment_method,
        change_for: change_for || null,
        address: address as any,
        status: 'SOLICITADO', // Novo status inicial para pedidos
        pix_code,
        pix_expiration,
        pix_qr_code_url,
      })
      .select()
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: orderError?.message || 'Erro ao criar pedido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Criar itens do pedido
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback: deletar pedido criado
      await supabaseClient
        .from('orders')
        .delete()
        .eq('id', order.id)

      return new Response(JSON.stringify({ error: itemsError.message || 'Erro ao criar itens do pedido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: order.id,
        message: 'Pedido criado com sucesso',
        pix_code: pix_code, // Retorna os detalhes do PIX
        pix_expiration: pix_expiration,
        pix_qr_code_url: pix_qr_code_url,
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

