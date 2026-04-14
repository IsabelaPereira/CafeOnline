// Supabase Edge Function — cria Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout
// Secrets: STRIPE_SECRET_KEY, SITE_URL

import Stripe from 'npm:stripe@14';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY não configurada.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    interface CheckoutItem { name: string; amount: number; quantity?: number }
    const {
      items,
      successPath,
      cancelPath,
      metadata,
    }: {
      items: CheckoutItem[];
      successPath: string;
      cancelPath: string;
      metadata?: Record<string, string>;
    } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: items.map((item) => ({
        price_data: {
          currency: 'brl',
          product_data: { name: item.name },
          unit_amount: Math.round(item.amount * 100), // centavos
        },
        quantity: item.quantity ?? 1,
      })),
      success_url: `${siteUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${cancelPath}`,
      metadata: metadata ?? {},
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
