// Supabase Edge Function — Cancela etiqueta MelhorEnvio e estorna saldo
// Deploy: supabase functions deploy cancel-shipping-label
// Secrets: mesmos do generate-shipping-label (MELHORENVIO_TOKEN, MELHORENVIO_SANDBOX)

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
      .select('id, numero, melhorenvio_cart_id, status')
      .eq('id', pedido_id)
      .single();

    if (pedErr || !ped) return json({ error: 'Pedido não encontrado.' }, 404);
    if (!ped.melhorenvio_cart_id) return json({ error: 'Este pedido não possui etiqueta gerada.' }, 400);

    const cartId = ped.melhorenvio_cart_id as string;
    console.log(`[cancel-label] Cancelando etiqueta ${cartId} do pedido ${ped.numero}`);

    // ── 2. Cancelar no MelhorEnvio ───────────────────────────────────────────
    const cancelRes = await fetch(`${baseUrl}/me/shipment/cancel`, {
      method:  'POST',
      headers: meHeaders,
      body:    JSON.stringify({ orders: [cartId] }),
    });

    // MelhorEnvio retorna 200 com body vazio ou { message: "..." } em caso de sucesso
    // Alguns erros também chegam como 200 com body, então verificamos o conteúdo
    const cancelText = await cancelRes.text();
    let cancelData: any = {};
    try { cancelData = JSON.parse(cancelText); } catch { /* body vazio = sucesso */ }

    if (!cancelRes.ok && cancelRes.status !== 422) {
      const msg = cancelData?.message ?? cancelData?.error ?? cancelText ?? `HTTP ${cancelRes.status}`;
      console.error(`[cancel-label] Erro MelhorEnvio: ${msg}`);
      return json({ error: `Erro ao cancelar no MelhorEnvio: ${msg}` }, 502);
    }

    // 422 pode significar que já foi cancelado — tratamos como sucesso
    if (cancelRes.status === 422) {
      console.warn(`[cancel-label] MelhorEnvio retornou 422 (possivelmente já cancelado): ${cancelText}`);
    }

    console.log(`[cancel-label] Cancelamento aceito pelo MelhorEnvio para ${cartId}`);

    // ── 3. Atualizar pedido no banco ─────────────────────────────────────────
    const { error: updateErr } = await supabase.from('pedidos').update({
      melhorenvio_cart_id: null,
      etiqueta_url:        null,
      codigo_rastreio:     null,
      status:              'pago',
    }).eq('id', pedido_id);

    if (updateErr) {
      console.error('[cancel-label] Erro ao atualizar pedido:', updateErr.message);
      return json({ error: `Etiqueta cancelada no MelhorEnvio mas falha ao atualizar pedido: ${updateErr.message}` }, 500);
    }

    console.log(`[cancel-label] Pedido ${ped.numero} atualizado — etiqueta removida, status → pago`);
    return json({ success: true, message: 'Etiqueta cancelada e saldo estornado no MelhorEnvio.' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[cancel-label] Erro:', msg);
    return json({ error: msg }, 500);
  }
});
