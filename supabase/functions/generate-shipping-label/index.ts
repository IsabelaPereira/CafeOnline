// Supabase Edge Function — Gera etiqueta de envio via MelhorEnvio
// Deploy: supabase functions deploy generate-shipping-label
// Secrets obrigatórios:
//   MELHORENVIO_TOKEN        — token de acesso da API
//   MELHORENVIO_SANDBOX      — 'true' para sandbox
//   ME_FROM_NOME             — nome do remetente
//   ME_FROM_EMAIL            — e-mail do remetente
//   ME_FROM_TELEFONE         — telefone do remetente (só dígitos)
//   ME_FROM_DOCUMENTO        — CPF ou CNPJ do remetente (só dígitos)
//   ME_FROM_CEP              — CEP do remetente (só dígitos)
//   ME_FROM_LOGRADOURO       — logradouro do remetente
//   ME_FROM_NUMERO           — número do remetente
//   ME_FROM_BAIRRO           — bairro do remetente
//   ME_FROM_CIDADE           — cidade do remetente
//   ME_FROM_ESTADO           — UF do remetente (ex: MG)
// Opcionais (têm default):
//   ME_PKG_PESO              — peso em kg (default: 1)
//   ME_PKG_ALTURA            — altura em cm (default: 10)
//   ME_PKG_LARGURA           — largura em cm (default: 20)
//   ME_PKG_COMPRIMENTO       — comprimento em cm (default: 30)
//   ME_SERVICE_ID            — ID do serviço (0 = mais barato automático)

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

  try {
    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const meToken            = Deno.env.get('MELHORENVIO_TOKEN');
    if (!meToken) return json({ error: 'MELHORENVIO_TOKEN não configurado.' }, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const sandbox  = Deno.env.get('MELHORENVIO_SANDBOX') === 'true';
    const baseUrl  = sandbox
      ? 'https://sandbox.melhorenvio.com.br/api/v2'
      : 'https://melhorenvio.com.br/api/v2';

    const meHeaders = {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${meToken}`,
      Accept:         'application/json',
      'User-Agent':   'Das Matas Clube/1.0 (contato@dasmatas.com.br)',
    };

    const { pedido_id } = await req.json();
    if (!pedido_id) return json({ error: 'pedido_id é obrigatório.' }, 400);

    // ── 1. Buscar pedido ─────────────────────────────────────────────────────
    const { data: ped, error: pedErr } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_id, endereco_entrega, total, tipo, status, melhorenvio_cart_id')
      .eq('id', pedido_id)
      .single();
    if (pedErr || !ped) return json({ error: 'Pedido não encontrado.' }, 404);

    if (ped.melhorenvio_cart_id) {
      return json({ error: 'Etiqueta já gerada para este pedido.', cart_id: ped.melhorenvio_cart_id }, 400);
    }

    // ── 2. Resolver destinatário ─────────────────────────────────────────────
    const end = (ped.endereco_entrega ?? {}) as Record<string, string>;
    let toName     = 'Cliente';
    let toPhone    = '';
    let toEmail    = '';
    let toDocument: string | null = null;

    if (ped.cliente_id) {
      const { data: cli } = await supabase
        .from('clientes').select('user_id, phone, cpf').eq('id', ped.cliente_id).maybeSingle();
      if (cli?.user_id) {
        const { data: prof } = await supabase
          .from('profiles').select('name, email').eq('id', cli.user_id).maybeSingle();
        toName  = prof?.name  ?? toName;
        toEmail = prof?.email ?? toEmail;
      }
      if (cli?.phone) toPhone    = cli.phone.replace(/\D/g, '');
      if (cli?.cpf)   toDocument = cli.cpf.replace(/\D/g, '');
    }

    // ── 3. Remetente (env vars) ──────────────────────────────────────────────
    const from = {
      name:         Deno.env.get('ME_FROM_NOME')        ?? '',
      phone:        Deno.env.get('ME_FROM_TELEFONE')    ?? '',
      email:        Deno.env.get('ME_FROM_EMAIL')       ?? '',
      document:     Deno.env.get('ME_FROM_DOCUMENTO')   ?? '',
      postal_code:  Deno.env.get('ME_FROM_CEP')         ?? '',
      address:      Deno.env.get('ME_FROM_LOGRADOURO')  ?? '',
      number:       Deno.env.get('ME_FROM_NUMERO')      ?? '',
      district:     Deno.env.get('ME_FROM_BAIRRO')      ?? '',
      city:         Deno.env.get('ME_FROM_CIDADE')      ?? '',
      state_abbr:   Deno.env.get('ME_FROM_ESTADO')      ?? '',
      country_id:   'BR',
      complement:   null,
    };

    // ── 4. Destinatário ──────────────────────────────────────────────────────
    const to = {
      name:        toName,
      phone:       toPhone,
      email:       toEmail,
      document:    toDocument,
      postal_code: (end.cep ?? '').replace(/\D/g, ''),
      address:     end.logradouro ?? '',
      number:      end.numero ?? '',
      complement:  end.complemento || null,
      district:    end.bairro ?? '',
      city:        end.cidade ?? '',
      state_abbr:  end.estado ?? '',
      country_id:  'BR',
    };

    if (!to.postal_code || !to.address) {
      return json({ error: 'Endereço de entrega do pedido incompleto.' }, 400);
    }

    // ── 5. Buscar itens do pedido (declaração de conteúdo) ──────────────────
    const { data: itensPedido } = await supabase
      .from('itens_pedido')
      .select('nome_produto, quantidade, preco_unitario')
      .eq('pedido_id', pedido_id);

    const products = (itensPedido ?? []).length > 0
      ? (itensPedido ?? []).map((item: any) => ({
          name:           String(item.nome_produto).slice(0, 50),
          quantity:       Number(item.quantidade) || 1,
          unitary_value:  Number(item.preco_unitario) || 1,
        }))
      : [{ name: 'Café especial', quantity: 1, unitary_value: Number(ped.total) || 1 }];

    // ── 6. Dimensões do pacote ───────────────────────────────────────────────
    const volume = {
      height: parseFloat(Deno.env.get('ME_PKG_ALTURA')       ?? '10'),
      width:  parseFloat(Deno.env.get('ME_PKG_LARGURA')      ?? '20'),
      length: parseFloat(Deno.env.get('ME_PKG_COMPRIMENTO')  ?? '30'),
      weight: parseFloat(Deno.env.get('ME_PKG_PESO')         ?? '1'),
    };

    // ── 6. Selecionar serviço ────────────────────────────────────────────────
    const configServiceId = parseInt(Deno.env.get('ME_SERVICE_ID') ?? '0', 10);
    let serviceId = configServiceId > 0 ? configServiceId : null;

    if (!serviceId) {
      // Calcular tarifas e selecionar o mais barato disponível
      const calcRes = await fetch(`${baseUrl}/me/shipment/calculate`, {
        method:  'POST',
        headers: meHeaders,
        body:    JSON.stringify({
          from:    { postal_code: from.postal_code },
          to:      { postal_code: to.postal_code },
          package: volume,
        }),
      });
      if (calcRes.ok) {
        const quotes = await calcRes.json() as any[];
        const available = (Array.isArray(quotes) ? quotes : [])
          .filter((q: any) => !q.error && q.price && q.delivery_time)
          .sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
        serviceId = available[0]?.id ?? 2; // fallback PAC = 2
        console.log(`[generate-label] Serviço selecionado: ${available[0]?.name ?? 'PAC'} (id=${serviceId})`);
      } else {
        serviceId = 2; // PAC como fallback
        console.warn('[generate-label] Falha ao calcular tarifas, usando PAC (id=2)');
      }
    }

    // ── 7. Adicionar ao carrinho ─────────────────────────────────────────────
    const cartRes = await fetch(`${baseUrl}/me/cart`, {
      method:  'POST',
      headers: meHeaders,
      body:    JSON.stringify({
        service:  serviceId,
        from,
        to,
        products,
        volumes:  [volume],
        options:  {
          insurance_value: Math.min(ped.total ?? 0, 500),
          receipt:         false,
          own_hand:        false,
          collect:         false,
          reverse:         false,
          non_commercial:  true,
          invoice:         { key: null },
          platform:        'Das Matas',
          tags:            [{ tag: ped.numero, url: null }],
        },
      }),
    });
    const cartData = await cartRes.json() as any;
    if (!cartRes.ok || cartData.errors || cartData.error) {
      const msg = cartData.message ?? cartData.error ?? JSON.stringify(cartData);
      console.error('[generate-label] Erro no cart:', msg);
      return json({ error: `Erro ao adicionar ao carrinho MelhorEnvio: ${msg}` }, 502);
    }
    const cartId: string = cartData.id;
    console.log(`[generate-label] Cart criado: ${cartId}`);

    // ── 8. Checkout (debita saldo MelhorEnvio) ───────────────────────────────
    const checkoutRes = await fetch(`${baseUrl}/me/shipment/checkout`, {
      method:  'POST',
      headers: meHeaders,
      body:    JSON.stringify({ orders: [cartId] }),
    });
    if (!checkoutRes.ok) {
      const err = await checkoutRes.json().catch(() => ({})) as any;
      const msg = err.message ?? `HTTP ${checkoutRes.status}`;
      console.error('[generate-label] Erro no checkout:', msg);
      return json({ error: `Falha no checkout MelhorEnvio: ${msg}` }, 502);
    }
    console.log(`[generate-label] Checkout concluído para ${cartId}`);

    // ── 9. Gerar etiqueta ────────────────────────────────────────────────────
    const generateRes = await fetch(`${baseUrl}/me/shipment/generate`, {
      method:  'POST',
      headers: meHeaders,
      body:    JSON.stringify({ orders: [cartId] }),
    });
    if (!generateRes.ok) {
      const err = await generateRes.json().catch(() => ({})) as any;
      console.warn('[generate-label] Aviso ao gerar etiqueta:', err);
      // Não aborta — print pode funcionar mesmo assim
    }
    console.log(`[generate-label] Etiqueta gerada para ${cartId}`);

    // ── 10. Obter URL de impressão ───────────────────────────────────────────
    let labelUrl: string | null = null;
    const printRes = await fetch(`${baseUrl}/me/shipment/print`, {
      method:  'POST',
      headers: meHeaders,
      body:    JSON.stringify({ mode: 'private', orders: [cartId] }),
    });
    if (printRes.ok) {
      const printData = await printRes.json() as any;
      labelUrl = printData.url ?? null;
      console.log(`[generate-label] Label URL: ${labelUrl}`);
    }

    // ── 11. Obter código de rastreio ─────────────────────────────────────────
    let trackingCode: string | null = null;
    const orderRes = await fetch(`${baseUrl}/me/orders/${cartId}`, { headers: meHeaders });
    if (orderRes.ok) {
      const orderData = await orderRes.json() as any;
      trackingCode = orderData.tracking ?? null;
      console.log(`[generate-label] Tracking: ${trackingCode}`);
    }

    // ── 12. Atualizar pedido ─────────────────────────────────────────────────
    await supabase.from('pedidos').update({
      melhorenvio_cart_id: cartId,
      etiqueta_url:        labelUrl,
      codigo_rastreio:     trackingCode,
      status:              'em_separacao',
    }).eq('id', pedido_id);

    console.log(`[generate-label] Pedido ${ped.numero} atualizado com etiqueta`);
    return json({ success: true, cart_id: cartId, label_url: labelUrl, tracking_code: trackingCode });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[generate-label] Erro:', msg);
    return json({ error: msg }, 500);
  }
});
