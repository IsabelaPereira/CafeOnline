// Edge Function — pós-checkout: ativa assinatura/pedido e salva cartão
// Para assinaturas recorrentes (mode: subscription), o webhook stripe-webhook
// cuida da cobrança e do pedido via invoice.paid. Esta função ativa a assinatura
// e salva o cartão como fallback imediato ao retorno do Stripe Checkout.
//
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

    // ── Recuperar sessão Stripe ──────────────────────────────────────────────
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const isSubscription = session.mode === 'subscription';

    // Verificar se o pagamento/checkout foi concluído
    const isComplete = isSubscription
      ? session.status === 'complete'
      : session.payment_status === 'paid';

    if (!isComplete) {
      return json({ ok: false, message: `Sessão ainda não concluída.` });
    }

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
    let clienteId: string | null = null;
    let card: Stripe.PaymentMethod.Card | null = null;

    // ── Processar por tipo ───────────────────────────────────────────────────
    if (tipo === 'assinatura') {
      const { data: ass } = await supabase
        .from('assinaturas')
        .select('id, cliente_id, status')
        .eq('id', record_id)
        .single();
      clienteId = ass?.cliente_id ?? null;

      if (ass && ass.status !== 'ativa') {
        const patch: Record<string, unknown> = { status: 'ativa', data_fim: null };

        if (isSubscription && session.subscription) {
          patch.stripe_subscription_id = session.subscription as string;
        }
        await supabase.from('assinaturas').update(patch).eq('id', record_id);
      }

      // Buscar cartão:
      if (isSubscription && session.subscription) {
        // Subscription: cartão está no default_payment_method da subscription
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string,
          { expand: ['default_payment_method'] },
        );
        const pm = sub.default_payment_method as Stripe.PaymentMethod | null;
        card = pm?.card ?? null;
      } else {
        // Payment: cartão está no payment_intent
        const fullSession = await stripe.checkout.sessions.retrieve(session_id, {
          expand: ['payment_intent.payment_method'],
        });
        const pi = fullSession.payment_intent as Stripe.PaymentIntent | null;
        const pm = pi?.payment_method as Stripe.PaymentMethod | null;
        card = pm?.card ?? null;

        // Para pagamento único, criar cobrança inicial se ainda não existe
        const { count } = await supabase
          .from('cobrancas_assinatura')
          .select('id', { count: 'exact', head: true })
          .eq('assinatura_id', record_id);
        if ((count ?? 0) === 0) {
          const { data: assData } = await supabase
            .from('assinaturas')
            .select('total_mensal')
            .eq('id', record_id)
            .single();
          if (assData) {
            await supabase.from('cobrancas_assinatura').insert({
              assinatura_id: record_id,
              data:          new Date().toISOString().split('T')[0],
              valor:         (session.amount_total ?? 0) / 100 || assData.total_mensal,
              status:        'pago',
              tentativas:    1,
              transacao_id:  (fullSession.payment_intent as Stripe.PaymentIntent | null)?.id ?? null,
            });
          }
        }
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

      // Cartão do payment_intent (compra na loja é sempre mode: payment)
      const fullSession = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['payment_intent.payment_method'],
      });
      const pi = fullSession.payment_intent as Stripe.PaymentIntent | null;
      const pm = pi?.payment_method as Stripe.PaymentMethod | null;
      card = pm?.card ?? null;
    }

    // ── Salvar informações do cartão e customer no cliente ───────────────────
    if (clienteId) {
      const patch: Record<string, string> = {};
      if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
      if (card) {
        patch.stripe_card_brand  = card.brand;
        patch.stripe_card_last4  = card.last4;
        patch.stripe_card_expiry = `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`;
      }
      if (Object.keys(patch).length > 0) {
        await supabase.from('clientes').update(patch).eq('id', clienteId);
      }
    }

    return json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
