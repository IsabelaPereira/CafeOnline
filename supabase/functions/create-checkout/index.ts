// Supabase Edge Function — cria Stripe Checkout Session
// Suporta mode: 'payment' (loja) e mode: 'subscription' (assinatura recorrente)
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
      priceId,
      mode = 'payment',
      successPath,
      cancelPath,
      metadata,
      customerId,
      customerEmail,
    }: {
      items?: CheckoutItem[];
      priceId?: string;
      mode?: 'payment' | 'subscription';
      successPath: string;
      cancelPath: string;
      metadata?: Record<string, string>;
      customerId?: string;
      customerEmail?: string;
    } = await req.json();

    // ── Resolver Stripe Customer (para cartões salvos) ──────────────────────
    let resolvedCustomerId: string | undefined = customerId;

    if (!resolvedCustomerId && customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        resolvedCustomerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({ email: customerEmail });
        resolvedCustomerId = created.id;
      }
    }

    // ── Montar line_items ────────────────────────────────────────────────────
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (mode === 'subscription' && priceId) {
      // Subscription com Price fixo do catálogo Stripe (valor igual para todos)
      lineItems = [{ price: priceId, quantity: 1 }];
    } else if (mode === 'subscription' && items && items.length > 0) {
      // Subscription com price_data dinâmico — permite valor diferente por cliente
      // (ideal quando o total inclui frete variável por região)
      lineItems = items.map(item => ({
        price_data: {
          currency: 'brl',
          product_data: { name: item.name },
          unit_amount: Math.round(item.amount * 100),
          recurring: { interval: 'month' },
        },
        quantity: item.quantity ?? 1,
      }));
    } else if (mode === 'payment' && items && items.length > 0) {
      // Payment único (compras na loja)
      lineItems = items.map(item => ({
        price_data: {
          currency: 'brl',
          product_data: { name: item.name },
          unit_amount: Math.round(item.amount * 100),
        },
        quantity: item.quantity ?? 1,
      }));
    } else {
      return json({ error: 'Informe items ou priceId.' }, 400);
    }

    // ── Criar Checkout Session ───────────────────────────────────────────────
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode,
      ...(resolvedCustomerId ? { customer: resolvedCustomerId } : {}),
      line_items: lineItems,
      success_url: `${siteUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}${cancelPath}`,
      metadata: metadata ?? {},
    };

    if (mode === 'payment') {
      // Salva o método de pagamento para uso futuro em compras na loja
      sessionParams.payment_intent_data = { setup_future_usage: 'on_session' };
    }

    if (mode === 'subscription' && metadata) {
      // Replica metadata na subscription para que invoice.paid possa identificar a assinatura
      sessionParams.subscription_data = { metadata };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return json({ url: session.url, customerId: resolvedCustomerId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
