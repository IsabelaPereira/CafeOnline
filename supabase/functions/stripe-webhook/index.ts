// Supabase Edge Function — Webhook Stripe para cobranças recorrentes
// Processa: checkout.session.completed, invoice.paid, invoice.payment_failed,
//           customer.subscription.deleted, customer.subscription.updated
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const stripeKey          = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret      = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl        = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Variáveis de ambiente ausentes.' }, 500);
    }

    const stripe   = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Verificar assinatura do webhook ─────────────────────────────────────
    const body = await req.text();
    const sig  = req.headers.get('stripe-signature') ?? '';

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch {
      return json({ error: 'Assinatura inválida.' }, 400);
    }

    // ── Despachar evento ─────────────────────────────────────────────────────
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, stripe, supabase);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, stripe, supabase);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, supabase);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;
    }

    return json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    console.error('[stripe-webhook] Erro:', message);
    return json({ error: message }, 500);
  }
});

// ── checkout.session.completed ───────────────────────────────────────────────
// Ativa a assinatura, salva stripe_subscription_id e dados do cartão.
async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  if (session.mode !== 'subscription') return;

  const assinaturaId       = session.metadata?.assinatura_id;
  const stripeSubId        = session.subscription as string | null;
  const stripeCustomerId   = session.customer as string | null;

  if (!assinaturaId || !stripeSubId) return;

  // Ativar assinatura e salvar stripe_subscription_id
  await supabase.from('assinaturas').update({
    status:                 'ativa',
    stripe_subscription_id: stripeSubId,
    data_fim:               null,
  }).eq('id', assinaturaId);

  // Buscar cliente_id
  const { data: ass } = await supabase
    .from('assinaturas')
    .select('cliente_id')
    .eq('id', assinaturaId)
    .single();

  if (!ass?.cliente_id) return;

  // Salvar dados do cartão via default_payment_method da subscription
  try {
    const sub  = await stripe.subscriptions.retrieve(stripeSubId, {
      expand: ['default_payment_method'],
    });
    const pm   = sub.default_payment_method as Stripe.PaymentMethod | null;
    const card = pm?.card ?? null;

    const patch: Record<string, string> = {};
    if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
    if (card) {
      patch.stripe_card_brand  = card.brand;
      patch.stripe_card_last4  = card.last4;
      patch.stripe_card_expiry = `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from('clientes').update(patch).eq('id', ass.cliente_id);
    }
  } catch (e) {
    console.error('[handleCheckoutComplete] Erro ao buscar cartão:', e);
  }
}

// ── invoice.paid ─────────────────────────────────────────────────────────────
// Cria ciclo + pedido + cobrança para cada fatura paga (1º mês e renovações).
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  const stripeInvoiceId   = invoice.id;
  const stripeSubId       = invoice.subscription as string | null;
  if (!stripeSubId) return; // Não é invoice de assinatura

  // Idempotência: verificar se já processamos esta invoice
  const { data: existing } = await supabase
    .from('cobrancas_assinatura')
    .select('id')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();
  if (existing) return;

  // Buscar assinatura via subscription.metadata (confiável, definido na criação)
  const sub = await stripe.subscriptions.retrieve(stripeSubId);
  const assinaturaId = sub.metadata?.assinatura_id;
  if (!assinaturaId) return;

  // Dados da assinatura
  const { data: ass } = await supabase
    .from('assinaturas')
    .select('id, cliente_id, frete, total_mensal, endereco_id, stripe_subscription_id')
    .eq('id', assinaturaId)
    .single();
  if (!ass) return;

  // Salvar stripe_subscription_id se ainda não estiver salvo (race condition)
  if (!ass.stripe_subscription_id) {
    await supabase.from('assinaturas')
      .update({ stripe_subscription_id: stripeSubId })
      .eq('id', assinaturaId);
  }

  // Buscar endereço de entrega
  let enderecoJson: Record<string, unknown> = {};
  if (ass.endereco_id) {
    const { data: end } = await supabase
      .from('enderecos')
      .select('id, cep, logradouro, numero, complemento, bairro, cidade, estado')
      .eq('id', ass.endereco_id)
      .single();
    if (end) enderecoJson = end;
  }

  // Derivar mês/ano do período da invoice
  const periodStart = invoice.period_start ?? Math.floor(Date.now() / 1000);
  const periodDate  = new Date(periodStart * 1000);
  const mes         = periodDate.getUTCMonth() + 1;
  const ano         = periodDate.getUTCFullYear();

  // Buscar edição correspondente ao mês/ano (pode ainda não existir)
  const { data: edicao } = await supabase
    .from('edicoes_clube')
    .select('id')
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle();
  const edicaoId = edicao?.id ?? null;

  // Upsert ciclo (único por assinatura+mês+ano)
  const { data: ciclo } = await supabase
    .from('ciclos_assinatura')
    .upsert(
      { assinatura_id: ass.id, mes, ano, edicao_id: edicaoId, status: 'pendente' },
      { onConflict: 'assinatura_id,mes,ano', ignoreDuplicates: false },
    )
    .select('id')
    .single();
  const cicloId = ciclo?.id ?? null;

  // Valor da cobrança
  const valor = (invoice.amount_paid ?? 0) / 100;

  // Inserir pedido de assinatura
  const numero = `DM-${ano}${String(mes).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
  const { data: pedido } = await supabase
    .from('pedidos')
    .insert({
      numero,
      cliente_id:      ass.cliente_id,
      subtotal:        valor,
      frete:           ass.frete ?? 0,
      desconto:        0,
      total:           valor,
      status:          'pago',
      endereco_entrega: enderecoJson,
      forma_pagamento: 'Stripe — Assinatura',
      tipo:            'assinatura',
      assinatura_id:   ass.id,
      ciclo_id:        cicloId,
    })
    .select('id')
    .single();

  // Item do pedido (produto virtual representando a edição do clube)
  if (pedido?.id) {
    await supabase.from('itens_pedido').insert({
      pedido_id:      pedido.id,
      produto_id:     null,
      nome_produto:   `Clube Das Matas — Edição ${mes}/${ano}`,
      sku_produto:    `CLUBE-${ano}${String(mes).padStart(2, '0')}`,
      quantidade:     1,
      preco_unitario: valor,
      subtotal:       valor,
    });
  }

  // Inserir cobrança com stripe_invoice_id para idempotência futura
  const { data: cobranca } = await supabase
    .from('cobrancas_assinatura')
    .insert({
      assinatura_id:    ass.id,
      data:             periodDate.toISOString().split('T')[0],
      valor,
      status:           'pago',
      tentativas:       1,
      transacao_id:     (invoice.payment_intent as string) ?? null,
      stripe_invoice_id: stripeInvoiceId,
    })
    .select('id')
    .single();

  // Atualizar ciclo com referências ao pedido e à cobrança
  if (cicloId) {
    await supabase
      .from('ciclos_assinatura')
      .update({ pedido_id: pedido?.id ?? null, cobranca_id: cobranca?.id ?? null })
      .eq('id', cicloId);
  }

  // Atualizar proxima_cobranca com o fim do período corrente
  if (sub.current_period_end) {
    const proximaCobranca = new Date(sub.current_period_end * 1000)
      .toISOString().split('T')[0];
    await supabase.from('assinaturas')
      .update({ proxima_cobranca: proximaCobranca, status: 'ativa' })
      .eq('id', assinaturaId);
  }
}

// ── invoice.payment_failed ───────────────────────────────────────────────────
// Registra tentativa falha e marca assinatura como inadimplente.
async function handleInvoiceFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>,
) {
  const stripeSubId = invoice.subscription as string | null;
  if (!stripeSubId) return;

  const { data: ass } = await supabase
    .from('assinaturas')
    .select('id')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle();
  if (!ass) return;

  const stripeInvoiceId = invoice.id;
  const valor = (invoice.amount_due ?? 0) / 100;

  // Verificar se já existe cobrança para esta invoice (retry)
  const { data: cobExist } = await supabase
    .from('cobrancas_assinatura')
    .select('id, tentativas')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();

  if (cobExist) {
    await supabase.from('cobrancas_assinatura')
      .update({ status: 'falhou', tentativas: (cobExist.tentativas ?? 0) + 1 })
      .eq('id', cobExist.id);
  } else {
    await supabase.from('cobrancas_assinatura').insert({
      assinatura_id:     ass.id,
      data:              new Date().toISOString().split('T')[0],
      valor,
      status:            'falhou',
      tentativas:        1,
      stripe_invoice_id: stripeInvoiceId,
    });
  }

  // Marcar assinatura como inadimplente
  await supabase.from('assinaturas')
    .update({ status: 'inadimplente' })
    .eq('id', ass.id);
}

// ── customer.subscription.deleted ───────────────────────────────────────────
// Cancela a assinatura quando o cliente cancela no Stripe.
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  await supabase.from('assinaturas')
    .update({
      status:   'cancelada',
      data_fim: new Date().toISOString().split('T')[0],
    })
    .eq('stripe_subscription_id', subscription.id);
}

// ── customer.subscription.updated ───────────────────────────────────────────
// Sincroniza proxima_cobranca quando o Stripe atualiza o período.
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  if (!subscription.current_period_end) return;
  const proximaCobranca = new Date(subscription.current_period_end * 1000)
    .toISOString().split('T')[0];
  await supabase.from('assinaturas')
    .update({ proxima_cobranca: proximaCobranca })
    .eq('stripe_subscription_id', subscription.id);
}
