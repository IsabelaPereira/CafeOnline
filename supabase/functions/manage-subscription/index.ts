// Supabase Edge Function — Gerenciamento do ciclo de vida da assinatura Stripe
// Deploy: supabase functions deploy manage-subscription
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL
//
// Actions: pause | resume | cancel_at_period_end | cancel_now | reactivate | retry_invoice | billing_portal | update_frete

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

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
      return json({ error: 'Configuração incompleta.' }, 500);
    }

    const stripe   = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { assinatura_id, action, motivo, nova_forma_entrega, novo_frete } = await req.json();

    if (!assinatura_id || !action) {
      return json({ error: 'assinatura_id e action são obrigatórios.' }, 400);
    }

    console.log(`[manage-subscription] action=${action} assinatura=${assinatura_id}`);

    // ── Buscar assinatura ─────────────────────────────────────────────────────
    const { data: ass, error: assErr } = await supabase
      .from('assinaturas')
      .select('id, status, stripe_subscription_id, cliente_id, plano_id')
      .eq('id', assinatura_id)
      .single();

    if (assErr || !ass) return json({ error: 'Assinatura não encontrada.' }, 404);

    // ── billing_portal — não exige stripe_subscription_id ────────────────────
    if (action === 'billing_portal') {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('stripe_customer_id')
        .eq('id', ass.cliente_id)
        .single();

      if (!cliente?.stripe_customer_id) {
        return json({ error: 'Cliente sem Stripe Customer ID.' }, 400);
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer:   cliente.stripe_customer_id,
        return_url: `${siteUrl}/admin/assinaturas`,
      });

      console.log(`[manage-subscription] Portal criado: ${portal.url}`);
      return json({ url: portal.url });
    }

    // ── Validar stripe_subscription_id — update_frete tolera assinatura ainda
    //    sem Subscription ativa (ex.: pendente), demais ações exigem ────────────
    const stripeSubId = ass.stripe_subscription_id as string | null;
    if (!stripeSubId && action !== 'update_frete') {
      return json({ error: 'Assinatura sem Stripe Subscription ID.' }, 400);
    }

    switch (action) {

      // ── Pausar cobrança (marca faturas como incobráveis) ──────────────────
      case 'pause': {
        await stripe.subscriptions.update(stripeSubId, {
          pause_collection: { behavior: 'mark_uncollectable' },
        });
        await supabase.from('assinaturas')
          .update({ status: 'pausada' })
          .eq('id', assinatura_id);
        console.log(`[manage-subscription] Assinatura ${assinatura_id} pausada`);
        return json({ success: true });
      }

      // ── Retomar após pausa ────────────────────────────────────────────────
      case 'resume': {
        // Passar null limpa o objeto pause_collection no Stripe
        await stripe.subscriptions.update(stripeSubId, {
          pause_collection: null as unknown as Stripe.Emptyable<Stripe.SubscriptionUpdateParams.PauseCollection>,
        });
        await supabase.from('assinaturas')
          .update({ status: 'ativa' })
          .eq('id', assinatura_id);
        console.log(`[manage-subscription] Assinatura ${assinatura_id} retomada`);
        return json({ success: true });
      }

      // ── Agendar cancelamento ao fim do período atual ──────────────────────
      case 'cancel_at_period_end': {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
        const sub        = await stripe.subscriptions.retrieve(stripeSubId);
        const cancelDate = new Date(sub.current_period_end * 1000).toISOString().split('T')[0];
        await supabase.from('assinaturas')
          .update({
            cancelamento_agendado:      true,
            data_cancelamento_agendado: cancelDate,
            motivo_cancelamento:        motivo ?? null,
          })
          .eq('id', assinatura_id);
        console.log(`[manage-subscription] Cancelamento agendado para ${cancelDate} — assinatura ${assinatura_id}`);
        return json({ success: true, cancelDate });
      }

      // ── Cancelar imediatamente ────────────────────────────────────────────
      case 'cancel_now': {
        await stripe.subscriptions.cancel(stripeSubId);
        await supabase.from('assinaturas')
          .update({
            status:                     'cancelada',
            data_fim:                   new Date().toISOString().split('T')[0],
            cancelamento_agendado:      false,
            data_cancelamento_agendado: null,
            motivo_cancelamento:        motivo ?? null,
          })
          .eq('id', assinatura_id);
        console.log(`[manage-subscription] Assinatura ${assinatura_id} cancelada imediatamente`);
        return json({ success: true });
      }

      // ── Reativar (reverte cancel_at_period_end) ───────────────────────────
      case 'reactivate': {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: false });
        await supabase.from('assinaturas')
          .update({
            cancelamento_agendado:      false,
            data_cancelamento_agendado: null,
            motivo_cancelamento:        null,
          })
          .eq('id', assinatura_id);
        console.log(`[manage-subscription] Cancelamento revertido — assinatura ${assinatura_id}`);
        return json({ success: true });
      }

      // ── Tentar pagar invoice em aberto (inadimplente) ─────────────────────
      case 'retry_invoice': {
        const invoices = await stripe.invoices.list({
          subscription: stripeSubId,
          limit:        1,
          status:       'open',
        });
        const invoice = invoices.data[0];
        if (!invoice) return json({ error: 'Nenhuma fatura em aberto.' }, 400);

        const paid = await stripe.invoices.pay(invoice.id);
        if (paid.status === 'paid') {
          await supabase.from('assinaturas')
            .update({ status: 'ativa' })
            .eq('id', assinatura_id);
        }
        console.log(`[manage-subscription] Retry invoice ${invoice.id} → status=${paid.status}`);
        return json({ success: true, invoiceStatus: paid.status });
      }

      // ── Alterar forma de entrega (retirada/entrega) e recalcular o valor ───
      case 'update_frete': {
        if (nova_forma_entrega !== 'entrega' && nova_forma_entrega !== 'retirada') {
          return json({ error: 'nova_forma_entrega deve ser "entrega" ou "retirada".' }, 400);
        }
        const freteNum = Number(novo_frete);
        if (!Number.isFinite(freteNum) || freteNum < 0) {
          return json({ error: 'novo_frete inválido.' }, 400);
        }

        const { data: plano, error: planoErr } = await supabase
          .from('planos').select('nome, preco').eq('id', ass.plano_id).single();
        if (planoErr || !plano) return json({ error: 'Plano da assinatura não encontrado.' }, 404);

        const novoTotal = plano.preco + freteNum;

        // Atualiza o preço da Subscription no Stripe, se já houver uma ativa.
        // proration_behavior: 'none' — o novo valor vale a partir da próxima
        // cobrança, sem gerar cobrança/estorno parcial no ciclo atual.
        // Usa product_data (produto novo e avulso) em vez de reaproveitar o
        // product já associado ao item — igual ao create-checkout — pois o
        // Stripe recusa criar um novo Price para um Product marcado inativo.
        if (stripeSubId) {
          const sub  = await stripe.subscriptions.retrieve(stripeSubId);
          const item = sub.items.data[0];
          if (!item) return json({ error: 'Item de cobrança não encontrado na assinatura Stripe.' }, 400);

          await stripe.subscriptions.update(stripeSubId, {
            items: [{
              id: item.id,
              price_data: {
                currency:     'brl',
                product_data: { name: plano.nome },
                unit_amount:  Math.round(novoTotal * 100),
                recurring:    { interval: 'month' },
              },
            }],
            proration_behavior: 'none',
          });
        }

        const { error: updErr } = await supabase.from('assinaturas').update({
          forma_entrega: nova_forma_entrega,
          frete:         freteNum,
          total_mensal:  novoTotal,
        }).eq('id', assinatura_id);
        if (updErr) return json({ error: updErr.message }, 500);

        console.log(`[manage-subscription] Forma de entrega da assinatura ${assinatura_id} → ${nova_forma_entrega} (frete R$${freteNum})`);
        return json({ success: true, totalMensal: novoTotal });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    console.error('[manage-subscription] Erro:', message);
    return json({ error: message }, 500);
  }
});
