// Edge Function — pós-checkout: ativa assinatura/pedido, cria cobrança e salva cartão
// Deploy: supabase functions deploy save-payment-method
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  try {
    const stripeKey          = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl        = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Variáveis de ambiente ausentes.' }, 500);
    }

    const stripe   = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      session_id,
      tipo,
      record_id,
    }: { session_id: string; tipo: 'assinatura' | 'pedido'; record_id: string } = await req.json();

    if (!session_id || !record_id) {
      return json({ error: 'session_id e record_id são obrigatórios.' }, 400);
    }

    // ── Recuperar sessão Stripe com payment_method expandido ─────────────────
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent.payment_method'],
    });

    // Verificar se o pagamento foi confirmado
    const paymentStatus = session.payment_status; // 'paid' | 'unpaid' | 'no_payment_required'
    if (paymentStatus !== 'paid') {
      return json({ ok: false, message: `Pagamento com status: ${paymentStatus}` });
    }

    const pi    = session.payment_intent as Stripe.PaymentIntent | null;
    const pm    = pi?.payment_method as Stripe.PaymentMethod | null;
    const card  = pm?.card ?? null;
    const valor = (session.amount_total ?? 0) / 100; // centavos → reais

    // ── Resolver cliente_id ──────────────────────────────────────────────────
    let clienteId: string | null = null;

    if (tipo === 'assinatura') {
      const { data } = await supabase
        .from('assinaturas')
        .select('id, cliente_id, status, total_mensal')
        .eq('id', record_id)
        .single();
      clienteId = data?.cliente_id ?? null;

      if (data && data.status !== 'ativa') {
        // 1. Ativar assinatura
        await supabase.from('assinaturas').update({
          status:   'ativa',
          data_fim: null,
        }).eq('id', record_id);

        // 2. Criar registro de cobrança
        await supabase.from('cobrancas_assinatura').insert({
          assinatura_id: record_id,
          data:          new Date().toISOString().split('T')[0],
          valor:         valor > 0 ? valor : (data.total_mensal ?? 0),
          status:        'pago',
          tentativas:    1,
          transacao_id:  pi?.id ?? null,
        });
      }
    } else {
      // Pedido: marcar como pago
      const { data } = await supabase
        .from('pedidos')
        .select('cliente_id, status')
        .eq('id', record_id)
        .single();
      clienteId = data?.cliente_id ?? null;

      if (data && data.status !== 'pago') {
        await supabase.from('pedidos').update({ status: 'pago' }).eq('id', record_id);
      }
    }

    // ── Salvar informações do cartão no cliente ──────────────────────────────
    if (clienteId && card) {
      const expiry = `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`;
      const patch: Record<string, string> = {
        stripe_card_brand:  card.brand,
        stripe_card_last4:  card.last4,
        stripe_card_expiry: expiry,
      };
      if (session.customer && typeof session.customer === 'string') {
        patch.stripe_customer_id = session.customer;
      }
      await supabase.from('clientes').update(patch).eq('id', clienteId);
    }

    return json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
