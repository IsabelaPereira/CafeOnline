// Supabase Edge Function — processa checks de carrinho abandonado
//
// Chamada periodicamente por pg_cron (ver migração 028). Para cada check
// cujo `scheduled_at` já passou e ainda não foi processado:
//
//   1. Lê o status atual da assinatura vinculada.
//   2. Se status = 'ativa' → aplica no lead:
//        etapa           = 'assinatura_concluida'
//        tags            += 'CARRINHO-ABANDONADA'
//        observacoes     = 'Cliente efetivou o pagamento da assinatura pelo site'
//        proximo_follow_up = agora + 20 min
//   3. Caso contrário → aplica no lead:
//        etapa           = 'carrinho-abandonado'
//        tags            += 'carrinho-abandonado'
//        observacoes     = 'Retornou do Stripe e não concluiu o pagamento em 15 min'
//        proximo_follow_up = agora + 20 min
//   4. Marca o check como processado.
//
// Deploy: supabase functions deploy process-abandonment-checks
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (setados pelo Supabase).

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadAbandonmentCheck {
  id: string;
  lead_id: string;
  assinatura_id: string | null;
}

interface LeadRow {
  tags: string[] | null;
  etapa: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'Config Supabase ausente.' }, 500);

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // 1. Busca checks pendentes vencidos
    const { data: checks, error: fetchErr } = await supabase
      .from('lead_abandonment_checks')
      .select('id, lead_id, assinatura_id')
      .is('processed_at', null)
      .lte('scheduled_at', new Date().toISOString())
      .limit(200);

    if (fetchErr) return json({ error: fetchErr.message }, 500);
    if (!checks || checks.length === 0) return json({ processed: 0 });

    let processedOk = 0;
    const errors: { id: string; message: string }[] = [];

    for (const check of checks as LeadAbandonmentCheck[]) {
      try {
        // 2. Verifica status da assinatura
        let ativa = false;
        if (check.assinatura_id) {
          const { data: ass } = await supabase
            .from('assinaturas')
            .select('status')
            .eq('id', check.assinatura_id)
            .maybeSingle();
          ativa = (ass as { status?: string } | null)?.status === 'ativa';
        }

        // 3. Busca tags atuais do lead para mesclar sem perder nada
        const { data: leadRow } = await supabase
          .from('leads')
          .select('tags, etapa')
          .eq('id', check.lead_id)
          .maybeSingle();

        const tagsAtuais = Array.isArray((leadRow as LeadRow | null)?.tags)
          ? ((leadRow as LeadRow).tags as string[])
          : [];
        const novaTag = ativa ? 'CARRINHO-ABANDONADA' : 'carrinho-abandonado';
        const tagsMescladas = Array.from(new Set([...tagsAtuais, novaTag]));
        const novaEtapa = ativa ? 'assinatura_concluida' : 'carrinho-abandonado';

        const now = new Date();
        const proximoFollowUp = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
        const observacoes = ativa
          ? 'Cliente efetivou o pagamento da assinatura pelo site'
          : 'Retornou do Stripe e não concluiu o pagamento em 15 min';

        // 4. Atualiza o lead
        const { error: updErr } = await supabase
          .from('leads')
          .update({
            etapa:              novaEtapa,
            tags:               tagsMescladas,
            observacoes,
            proximo_follow_up:  proximoFollowUp,
            ultimo_contato:     now.toISOString().split('T')[0],
          })
          .eq('id', check.lead_id);

        if (updErr) throw new Error(`Erro ao atualizar lead: ${updErr.message}`);

        // 5. Registra histórico de etapa, se mudou
        const etapaAnterior = (leadRow as LeadRow | null)?.etapa ?? null;
        if (etapaAnterior !== novaEtapa) {
          await supabase.from('historico_etapa_lead').insert({
            lead_id:        check.lead_id,
            etapa_anterior: etapaAnterior,
            etapa_nova:     novaEtapa,
            alterado_por:   'cron',
            alterado_em:    now.toISOString(),
          });
        }

        // 6. Marca check como processado
        await supabase
          .from('lead_abandonment_checks')
          .update({
            processed_at: now.toISOString(),
            result:       ativa ? 'pago' : 'abandonado',
          })
          .eq('id', check.id);

        processedOk++;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'erro desconhecido';
        errors.push({ id: check.id, message });
      }
    }

    return json({ total: checks.length, processed: processedOk, errors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
