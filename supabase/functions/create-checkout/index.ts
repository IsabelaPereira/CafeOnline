// Supabase Edge Function — cria Stripe Checkout Session com suporte a cliente salvo
// Deploy: supabase functions deploy create-checkout
// Secrets: STRIPE_SECRET_KEY, SITE_URL

import Stripe from 'npm:stripe@14';

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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return json({ error: 'STRIPE_SECRET_KEY não configurada.' }, 500);
    }

    const stripe  = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    interface CheckoutItem { name: string; amount: number; quantity?: number }
    const {
      items,
      successPath,
      cancelPath,
      metadata,
      customerId,
      customerEmail,
    }: {
      items: CheckoutItem[];
      successPath: string;
      cancelPath: string;
      metadata?: Record<string, string>;
      customerId?: string;
      customerEmail?: string;
    } = await req.json();

    // ── Resolver Stripe Customer (para cartões salvos) ──────────────────────
    let resolvedCustomerId: string | undefined = customerId;

    if (!resolvedCustomerId && customerEmail) {
      // Busca cliente existente pelo e-mail
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        resolvedCustomerId = existing.data[0].id;
      } else {
        // Cria novo customer no Stripe
        const created = await stripe.customers.create({ email: customerEmail });
        resolvedCustomerId = created.id;
      }
    }

    // ── Criar Checkout Session ───────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(resolvedCustomerId ? { customer: resolvedCustomerId } : {}),
      // Salva o método de pagamento para uso futuro (exibido nos próximos checkouts)
      payment_intent_data: {
        setup_future_usage: 'on_session',
      },
      line_items: items.map(item => ({
        price_data: {
          currency: 'brl',
          product_data: { name: item.name },
          unit_amount: Math.round(item.amount * 100), // centavos
        },
        quantity: item.quantity ?? 1,
      })),
      success_url: `${siteUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}${cancelPath}`,
      metadata: metadata ?? {},
    });

    return json({ url: session.url, customerId: resolvedCustomerId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
