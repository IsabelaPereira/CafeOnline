// Supabase Edge Function — Webhook Stripe para cobranças recorrentes
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
      console.error('[stripe-webhook] Variáveis de ambiente ausentes');
      return json({ error: 'Configuração incompleta.' }, 500);
    }

    const stripe   = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Verificar assinatura do webhook ─────────────────────────────────────
    // constructEventAsync usa Web Crypto API — obrigatório no Deno (sem Node crypto)
    const body = await req.text();
    const sig  = req.headers.get('stripe-signature') ?? '';

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      console.error('[stripe-webhook] Falha na verificação de assinatura:', err);
      return json({ error: 'Assinatura inválida.' }, 400);
    }

    console.log(`[stripe-webhook] Evento recebido: ${event.type} (${event.id})`);

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
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription, supabase);
        break;
      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event.data.object as Stripe.Subscription, supabase);
        break;
      case 'invoice.payment_action_required':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, supabase);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, supabase);
        break;
      default:
        console.log(`[stripe-webhook] Evento ignorado: ${event.type}`);
    }

    return json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    console.error('[stripe-webhook] Erro não tratado:', message);
    // Retorna 500 para o Stripe retentar o evento
    return json({ error: message }, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve o assinatura_id a partir do subscription: tenta metadata do Stripe,
 *  depois busca no banco pelo stripe_subscription_id (fallback para quando
 *  subscription_data.metadata não foi setado no checkout). */
async function resolverAssinaturaId(
  stripeSubId: string,
  sub: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  // 1. Metadata da subscription (definido em subscription_data.metadata no checkout)
  const fromMeta = sub.metadata?.assinatura_id ?? null;
  if (fromMeta) return fromMeta;

  // 2. Fallback: busca pelo stripe_subscription_id já gravado no banco
  const { data } = await supabase
    .from('assinaturas')
    .select('id')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle();
  if (data?.id) return data.id;

  // 3. Fallback: metadata da session (session.metadata foi gravado no checkout)
  //    Não disponível aqui — a assinatura pode ter sido criada sem metadata.
  console.warn(`[resolverAssinaturaId] Assinatura não encontrada para sub ${stripeSubId}`);
  return null;
}

// ── checkout.session.completed ───────────────────────────────────────────────
async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  if (session.mode !== 'subscription') return;

  const assinaturaId     = session.metadata?.assinatura_id;
  const stripeSubId      = session.subscription as string | null;
  const stripeCustomerId = session.customer as string | null;

  if (!assinaturaId || !stripeSubId) {
    console.warn('[checkout.session.completed] Sem assinatura_id ou subscription id');
    return;
  }

  console.log(`[checkout.session.completed] Ativando assinatura ${assinaturaId} → sub ${stripeSubId}`);

  await supabase.from('assinaturas').update({
    status:                 'ativa',
    stripe_subscription_id: stripeSubId,
    data_fim:               null,
  }).eq('id', assinaturaId);

  // Buscar e salvar cartão
  const { data: ass } = await supabase
    .from('assinaturas').select('cliente_id').eq('id', assinaturaId).single();

  if (ass?.cliente_id) {
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
      console.error('[checkout.session.completed] Erro ao buscar cartão:', e);
    }
  }

  console.log(`[checkout.session.completed] Concluído para assinatura ${assinaturaId}`);
}

// ── invoice.paid ─────────────────────────────────────────────────────────────
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  const stripeInvoiceId = invoice.id;
  const stripeSubId     = invoice.subscription as string | null;

  if (!stripeSubId) {
    console.log('[invoice.paid] Sem subscription_id — ignorando');
    return;
  }

  console.log(`[invoice.paid] Processando invoice ${stripeInvoiceId} da sub ${stripeSubId}`);

  // Idempotência
  const { data: existing } = await supabase
    .from('cobrancas_assinatura')
    .select('id')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();
  if (existing) {
    console.log(`[invoice.paid] Invoice ${stripeInvoiceId} já processada — ignorando`);
    return;
  }

  // Resolver assinatura (metadata → DB → fallback)
  const sub          = await stripe.subscriptions.retrieve(stripeSubId);
  const assinaturaId = await resolverAssinaturaId(stripeSubId, sub, supabase);
  if (!assinaturaId) {
    console.error(`[invoice.paid] Não foi possível resolver assinatura para sub ${stripeSubId}`);
    throw new Error(`Assinatura não encontrada para subscription ${stripeSubId}`);
  }

  // Dados da assinatura + endereço
  const { data: ass, error: assErr } = await supabase
    .from('assinaturas')
    .select('id, cliente_id, frete, total_mensal, endereco_id, stripe_subscription_id')
    .eq('id', assinaturaId)
    .single();
  if (assErr || !ass) {
    console.error(`[invoice.paid] Assinatura ${assinaturaId} não encontrada:`, assErr);
    throw new Error(`Assinatura ${assinaturaId} não encontrada`);
  }

  // Garantir stripe_subscription_id salvo (caso checkout.session.completed não tenha rodado ainda)
  if (!ass.stripe_subscription_id) {
    await supabase.from('assinaturas')
      .update({ stripe_subscription_id: stripeSubId })
      .eq('id', assinaturaId);
  }

  // Endereço de entrega
  let enderecoJson: Record<string, unknown> = {};
  if (ass.endereco_id) {
    const { data: end } = await supabase
      .from('enderecos')
      .select('id, cep, logradouro, numero, complemento, bairro, cidade, estado')
      .eq('id', ass.endereco_id).single();
    if (end) enderecoJson = end;
  }

  // Mês/ano da cobrança
  const periodStart = invoice.period_start ?? Math.floor(Date.now() / 1000);
  const periodDate  = new Date(periodStart * 1000);
  const mes         = periodDate.getUTCMonth() + 1;
  const ano         = periodDate.getUTCFullYear();

  console.log(`[invoice.paid] Criando ciclo ${mes}/${ano} para assinatura ${assinaturaId}`);

  // Buscar edição correspondente
  const { data: edicao } = await supabase
    .from('edicoes_clube').select('id').eq('mes', mes).eq('ano', ano).maybeSingle();

  // Upsert ciclo
  const { data: ciclo, error: cicloErr } = await supabase
    .from('ciclos_assinatura')
    .upsert(
      { assinatura_id: ass.id, mes, ano, edicao_id: edicao?.id ?? null, status: 'pendente' },
      { onConflict: 'assinatura_id,mes,ano', ignoreDuplicates: false },
    )
    .select('id').single();
  if (cicloErr) console.error('[invoice.paid] Erro ao criar ciclo:', cicloErr);
  const cicloId = ciclo?.id ?? null;

  // Criar pedido
  const valor  = (invoice.amount_paid ?? 0) / 100;
  const numero = `DM-${ano}${String(mes).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;

  const { data: pedido, error: pedErr } = await supabase.from('pedidos').insert({
    numero,
    cliente_id:       ass.cliente_id,
    subtotal:         valor,
    frete:            ass.frete ?? 0,
    desconto:         0,
    total:            valor,
    status:           'pago',
    endereco_entrega: enderecoJson,
    forma_pagamento:  'Stripe — Assinatura',
    tipo:             'assinatura',
    assinatura_id:    ass.id,
    ciclo_id:         cicloId,
  }).select('id').single();

  if (pedErr) {
    console.error('[invoice.paid] Erro ao criar pedido:', pedErr);
    throw new Error(`Erro ao criar pedido: ${pedErr.message}`);
  }
  console.log(`[invoice.paid] Pedido criado: ${pedido?.id} (${numero})`);

  // Item do pedido
  if (pedido?.id) {
    const { error: itemErr } = await supabase.from('itens_pedido').insert({
      pedido_id:      pedido.id,
      produto_id:     null,
      nome_produto:   `Clube Das Matas — Edição ${mes}/${ano}`,
      sku_produto:    `CLUBE-${ano}${String(mes).padStart(2, '0')}`,
      quantidade:     1,
      preco_unitario: valor,
      subtotal:       valor,
    });
    if (itemErr) console.error('[invoice.paid] Erro ao criar item_pedido:', itemErr);
  }

  // Criar cobrança
  const { data: cobranca, error: cobErr } = await supabase.from('cobrancas_assinatura').insert({
    assinatura_id:     ass.id,
    data:              periodDate.toISOString().split('T')[0],
    valor,
    status:            'pago',
    tentativas:        1,
    transacao_id:      (invoice.payment_intent as string) ?? null,
    stripe_invoice_id: stripeInvoiceId,
  }).select('id').single();

  if (cobErr) {
    console.error('[invoice.paid] Erro ao criar cobrança:', cobErr);
    throw new Error(`Erro ao criar cobrança: ${cobErr.message}`);
  }
  console.log(`[invoice.paid] Cobrança criada: ${cobranca?.id}`);

  // Atualizar ciclo com referências
  if (cicloId) {
    await supabase.from('ciclos_assinatura')
      .update({ pedido_id: pedido?.id ?? null, cobranca_id: cobranca?.id ?? null })
      .eq('id', cicloId);
  }

  // Atualizar proxima_cobranca
  if (sub.current_period_end) {
    await supabase.from('assinaturas').update({
      proxima_cobranca: new Date(sub.current_period_end * 1000).toISOString().split('T')[0],
      status:           'ativa',
    }).eq('id', assinaturaId);
  }

  console.log(`[invoice.paid] Concluído — pedido ${numero}, ciclo ${mes}/${ano}`);
}

// ── invoice.payment_failed ───────────────────────────────────────────────────
async function handleInvoiceFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>,
) {
  const stripeSubId = invoice.subscription as string | null;
  if (!stripeSubId) return;

  const { data: ass } = await supabase
    .from('assinaturas').select('id')
    .eq('stripe_subscription_id', stripeSubId).maybeSingle();
  if (!ass) return;

  const stripeInvoiceId = invoice.id;
  const valor           = (invoice.amount_due ?? 0) / 100;

  const { data: cobExist } = await supabase
    .from('cobrancas_assinatura').select('id, tentativas')
    .eq('stripe_invoice_id', stripeInvoiceId).maybeSingle();

  if (cobExist) {
    await supabase.from('cobrancas_assinatura')
      .update({ status: 'falhou', tentativas: (cobExist.tentativas ?? 0) + 1 })
      .eq('id', cobExist.id);
  } else {
    await supabase.from('cobrancas_assinatura').insert({
      assinatura_id: ass.id, data: new Date().toISOString().split('T')[0],
      valor, status: 'falhou', tentativas: 1, stripe_invoice_id: stripeInvoiceId,
    });
  }

  await supabase.from('assinaturas').update({ status: 'inadimplente' }).eq('id', ass.id);
  console.log(`[invoice.payment_failed] Assinatura ${ass.id} marcada como inadimplente`);
}

// ── customer.subscription.deleted ───────────────────────────────────────────
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  // Montar motivo a partir dos detalhes de cancelamento do Stripe
  const details   = (subscription as any).cancellation_details as { reason?: string | null; feedback?: string | null; comment?: string | null } | null;
  const motivoPartes: string[] = [];
  if (details?.reason)   motivoPartes.push(motivoLabel(details.reason));
  if (details?.feedback) motivoPartes.push(feedbackLabel(details.feedback));
  if (details?.comment)  motivoPartes.push(details.comment);
  const motivo = motivoPartes.length > 0 ? motivoPartes.join(' — ') : null;

  // Detectar origem (portal do cliente ou ação administrativa/API)
  // O campo ended_at indica quando a sub foi efetivamente encerrada
  const origem = details?.reason === 'cancellation_requested'
    ? 'Portal do cliente (Stripe)'
    : details?.reason === 'payment_failed'
      ? 'Cancelamento automático por inadimplência (Stripe)'
      : details?.reason === 'payment_disputed'
        ? 'Cancelamento por disputa de pagamento (Stripe)'
        : 'Cancelamento via Stripe';

  // Buscar assinatura para obter o id interno
  const { data: ass } = await supabase
    .from('assinaturas')
    .select('id, status')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (!ass) {
    console.warn(`[subscription.deleted] Assinatura não encontrada para sub ${subscription.id}`);
    return;
  }

  const hoje = new Date().toISOString().split('T')[0];

  // Atualizar status
  await supabase.from('assinaturas').update({
    status:                     'cancelada',
    data_fim:                   hoje,
    cancelamento_agendado:      false,
    data_cancelamento_agendado: null,
    motivo_cancelamento:        motivo,
  }).eq('id', ass.id);

  // Registrar histórico de alteração
  await supabase.from('alteracoes_assinatura').insert({
    assinatura_id: ass.id,
    tipo:          'cancelamento',
    de:            ass.status,
    para:          'cancelada',
    data:          new Date().toISOString(),
    usuario:       origem,
  });

  console.log(`[subscription.deleted] Assinatura ${ass.id} cancelada — origem: ${origem}${motivo ? ` — motivo: ${motivo}` : ''}`);
}

function motivoLabel(reason: string): string {
  const map: Record<string, string> = {
    cancellation_requested: 'Solicitado pelo cliente',
    payment_failed:         'Falha no pagamento',
    payment_disputed:       'Disputa de pagamento',
  };
  return map[reason] ?? reason;
}

function feedbackLabel(feedback: string): string {
  const map: Record<string, string> = {
    customer_service:  'Atendimento ao cliente',
    low_quality:       'Qualidade baixa',
    missing_features:  'Funcionalidades ausentes',
    other:             'Outro motivo',
    switched_service:  'Trocou por outro serviço',
    too_complex:       'Muito complexo',
    too_expensive:     'Preço elevado',
    unused:            'Não estava utilizando',
  };
  return map[feedback] ?? feedback;
}

// ── customer.subscription.updated ───────────────────────────────────────────
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  const patch: Record<string, unknown> = {};

  if (subscription.current_period_end) {
    patch.proxima_cobranca = new Date(subscription.current_period_end * 1000).toISOString().split('T')[0];
  }

  // Sincronizar status Stripe → status local
  const stripeStatus = subscription.status;
  if (stripeStatus === 'active') {
    patch.status = 'ativa';
  } else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid' || stripeStatus === 'incomplete') {
    patch.status = 'inadimplente';
  } else if (stripeStatus === 'canceled') {
    patch.status = 'cancelada';
    patch.data_fim = new Date().toISOString().split('T')[0];
  } else if (stripeStatus === 'paused') {
    patch.status = 'pausada';
  }

  // Cancelamento agendado no fim do período
  let cancelamentoAgendadoNovo: boolean | null = null;
  if (subscription.cancel_at_period_end && subscription.cancel_at) {
    patch.cancelamento_agendado      = true;
    patch.data_cancelamento_agendado = new Date(subscription.cancel_at * 1000).toISOString().split('T')[0];
    cancelamentoAgendadoNovo = true;
  } else if (!subscription.cancel_at_period_end) {
    patch.cancelamento_agendado      = false;
    patch.data_cancelamento_agendado = null;
    cancelamentoAgendadoNovo = false;
  }

  if (Object.keys(patch).length === 0) return;

  // Buscar assinatura atual para registrar histórico quando necessário
  const { data: ass } = await supabase
    .from('assinaturas')
    .select('id, status, cancelamento_agendado')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  await supabase.from('assinaturas').update(patch).eq('stripe_subscription_id', subscription.id);
  console.log(`[subscription.updated] Patch aplicado para sub ${subscription.id}:`, patch);

  // Registrar histórico quando cancelamento é agendado via portal/Stripe externamente
  if (ass && cancelamentoAgendadoNovo === true && !ass.cancelamento_agendado) {
    await supabase.from('alteracoes_assinatura').insert({
      assinatura_id: ass.id,
      tipo:          'cancelamento_agendado',
      de:            'ativa',
      para:          patch.data_cancelamento_agendado as string,
      data:          new Date().toISOString(),
      usuario:       'Portal do cliente (Stripe)',
    });
    console.log(`[subscription.updated] Cancelamento agendado registrado para assinatura ${ass.id}`);
  }
}

// ── customer.subscription.paused ────────────────────────────────────────────
async function handleSubscriptionPaused(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  await supabase.from('assinaturas')
    .update({ status: 'pausada' })
    .eq('stripe_subscription_id', subscription.id);
  console.log(`[subscription.paused] Assinatura pausada para sub ${subscription.id}`);
}

// ── customer.subscription.resumed ───────────────────────────────────────────
async function handleSubscriptionResumed(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  await supabase.from('assinaturas')
    .update({ status: 'ativa', cancelamento_agendado: false, data_cancelamento_agendado: null })
    .eq('stripe_subscription_id', subscription.id);
  console.log(`[subscription.resumed] Assinatura retomada para sub ${subscription.id}`);
}

// ── charge.refunded ──────────────────────────────────────────────────────────
async function handleChargeRefunded(
  charge: Stripe.Charge,
  supabase: ReturnType<typeof createClient>,
) {
  const chargeId = charge.id;

  // Atualizar cobrança pelo transacao_id (payment_intent) ou charge_id
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

  if (paymentIntentId) {
    await supabase.from('cobrancas_assinatura')
      .update({ status: 'estornado' })
      .eq('transacao_id', paymentIntentId);
  }

  // Atualizar pedido vinculado ao payment_intent
  if (paymentIntentId) {
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id')
      .eq('forma_pagamento', 'Stripe — Assinatura')
      .ilike('numero', 'DM-%')
      .maybeSingle();

    // Busca mais precisa pelo ciclo vinculado à cobrança
    const { data: cob } = await supabase
      .from('cobrancas_assinatura')
      .select('id')
      .eq('transacao_id', paymentIntentId)
      .maybeSingle();

    if (cob?.id) {
      await supabase.from('pedidos')
        .update({ status: 'reembolsado' })
        .eq('ciclo_id', (
          await supabase.from('ciclos_assinatura')
            .select('id')
            .eq('cobranca_id', cob.id)
            .maybeSingle()
        ).data?.id ?? '');
    }
    void pedido; // used only for type narrowing above
  }

  console.log(`[charge.refunded] Cobrança estornada: charge=${chargeId} payment_intent=${paymentIntentId}`);
}
