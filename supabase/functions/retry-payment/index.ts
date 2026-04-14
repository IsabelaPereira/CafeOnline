// Edge Function — gera novo link de pagamento Stripe para assinatura inadimplente
// Deploy: supabase functions deploy retry-payment
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL

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
    const siteUrl            = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Variáveis de ambiente ausentes.' }, 500);
    }

    const stripe   = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { assinatura_id }: { assinatura_id: string } = await req.json();

    if (!assinatura_id) {
      return json({ error: 'assinatura_id é obrigatório.' }, 400);
    }

    // ── Carregar assinatura + plano ──────────────────────────────────────────
    const { data: assin, error: assinErr } = await supabase
      .from('assinaturas')
      .select('id, total_mensal, cliente_id, plano_id, plano:planos(nome)')
      .eq('id', assinatura_id)
      .single();

    if (assinErr || !assin) {
      return json({ error: 'Assinatura não encontrada.' }, 404);
    }

    // ── Carregar cliente (stripe_customer_id + user_id) ──────────────────────
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, user_id, stripe_customer_id')
      .eq('id', assin.cliente_id)
      .single();

    // ── Carregar profile (email) ─────────────────────────────────────────────
    let customerEmail: string | undefined;
    let resolvedCustomerId: string | undefined = cliente?.stripe_customer_id ?? undefined;

    if (cliente?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', cliente.user_id)
        .single();
      customerEmail = profile?.email ?? undefined;
    }

    // Se não temos customer_id salvo, tenta buscar ou criar no Stripe
    if (!resolvedCustomerId && customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        resolvedCustomerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({ email: customerEmail });
        resolvedCustomerId = created.id;
      }
    }

    const nomePlano = (assin.plano as { nome?: string } | null)?.nome ?? 'Assinatura';

    // ── Criar nova Checkout Session ──────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(resolvedCustomerId ? { customer: resolvedCustomerId } : {}),
      ...(customerEmail && !resolvedCustomerId ? { customer_email: customerEmail } : {}),
      payment_intent_data: { setup_future_usage: 'on_session' },
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: `${nomePlano} — reativação de assinatura` },
          unit_amount: Math.round(assin.total_mensal * 100),
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/sucesso?tipo=assinatura&id=${assinatura_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/cliente/assinaturas`,
      metadata: { assinatura_id, tipo: 'reprocessamento' },
    });

    return json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
