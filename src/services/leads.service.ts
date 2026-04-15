import { supabase } from '../lib/supabase';
import type { Lead, InteracaoCRM, HistoricoEtapaLead } from '../types';

function mapLead(r: any): Lead {
  return {
    id: r.id, nome: r.nome, email: r.email, telefone: r.telefone ?? '',
    origem: r.origem as Lead['origem'], etapa: r.etapa as Lead['etapa'],
    interesse: r.interesse ?? undefined, planoDesejado: r.plano_desejado ?? undefined,
    tags: r.tags ?? [], responsavel: r.responsavel ?? undefined,
    ultimoContato: r.ultimo_contato ?? undefined, proximoFollowUp: r.proximo_follow_up ?? undefined,
    observacoes: r.observacoes ?? undefined, clienteId: r.cliente_id ?? undefined,
    interacoes: (r.interacoes ?? []).map((i: any): InteracaoCRM => ({
      id: i.id, tipo: i.tipo as InteracaoCRM['tipo'], descricao: i.descricao,
      data: i.data, usuario: i.usuario ?? '',
    })),
    createdAt: r.created_at,
  };
}

function mapHistorico(r: any): HistoricoEtapaLead {
  return {
    id:             r.id,
    leadId:         r.lead_id,
    etapaAnterior:  r.etapa_anterior ?? undefined,
    etapaNova:      r.etapa_nova,
    alteradoPor:    r.alterado_por ?? undefined,
    alteradoEm:     r.alterado_em,
    observacoes:    r.observacoes ?? undefined,
    origem:         r.origem ?? undefined,
    interesse:      r.interesse ?? undefined,
    planoDesejado:  r.plano_desejado ?? undefined,
    tags:           r.tags ?? undefined,
    ultimoContato:  r.ultimo_contato ?? undefined,
    proximoFollowUp: r.proximo_follow_up ?? undefined,
  };
}

/** Campos do lead que são guardados como snapshot em cada registro de histórico */
const SNAPSHOT_SELECT =
  'etapa, tags, observacoes, origem, interesse, plano_desejado, ultimo_contato, proximo_follow_up';

function buildSnapshot(lead: any, override: {
  etapaNova: string;
  tags?: string[];
  observacoes?: string;
  interesse?: string;
  planoDesejado?: string;
  ultimoContato?: string;
  proximoFollowUp?: string;
}) {
  return {
    observacoes:       override.observacoes    ?? lead?.observacoes    ?? null,
    origem:            lead?.origem             ?? null,
    interesse:         override.interesse      ?? lead?.interesse      ?? null,
    plano_desejado:    override.planoDesejado  ?? lead?.plano_desejado ?? null,
    tags:              override.tags           ?? lead?.tags           ?? [],
    ultimo_contato:    override.ultimoContato  ?? lead?.ultimo_contato ?? null,
    proximo_follow_up: override.proximoFollowUp ?? lead?.proximo_follow_up ?? null,
  };
}

const LEAD_SELECT = [
  'etapa, id, nome, email, telefone, origem, interesse, plano_desejado, tags, responsavel',
  'ultimo_contato, proximo_follow_up, observacoes, cliente_id, created_at',
  'interacoes:interacoes_crm(id, tipo, descricao, data, usuario)',
].join(', ');

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads').select(LEAD_SELECT).eq('id', id).single();
  if (error) return null;
  return mapLead(data);
}

export async function getLeadByEmail(email: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads').select(LEAD_SELECT).eq('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapLead(data);
}

export async function createLead(l: { nome: string; email: string; telefone?: string; origem?: Lead['origem']; interesse?: string; planoDesejado?: string }): Promise<Lead> {
  const { data: existing } = await supabase.from('leads').select('id').eq('email', l.email).maybeSingle();
  if (existing) return getLead(existing.id) as Promise<Lead>;

  const { data, error } = await supabase.from('leads').insert({
    nome: l.nome, email: l.email, telefone: l.telefone, origem: l.origem ?? 'landing',
    interesse: l.interesse, plano_desejado: l.planoDesejado, etapa: 'novo',
  }).select().single();
  if (error) throw error;
  return mapLead(data);
}

export async function updateLeadEtapa(id: string, etapa: Lead['etapa'], alteradoPor?: string): Promise<void> {
  const { data: atual } = await supabase
    .from('leads').select(`etapa, ${SNAPSHOT_SELECT}`).eq('id', id).single();
  const etapaAnterior = (atual as any)?.etapa ?? null;

  const { error } = await supabase.from('leads')
    .update({ etapa, ultimo_contato: new Date().toISOString().split('T')[0] }).eq('id', id);
  if (error) throw error;

  await supabase.from('historico_etapa_lead').insert({
    lead_id:        id,
    etapa_anterior: etapaAnterior,
    etapa_nova:     etapa,
    alterado_por:   alteradoPor ?? null,
    alterado_em:    new Date().toISOString(),
    ...buildSnapshot(atual, { etapaNova: etapa }),
  });
}

// ── Histórico de etapa ──────────────────────────────────────────────────────

const HISTORICO_SELECT = [
  'id, lead_id, etapa_anterior, etapa_nova, alterado_por, alterado_em',
  'observacoes, origem, interesse, plano_desejado, tags, ultimo_contato, proximo_follow_up',
].join(', ');

export async function getHistoricoEtapaLead(leadId: string): Promise<HistoricoEtapaLead[]> {
  const { data, error } = await supabase
    .from('historico_etapa_lead')
    .select(HISTORICO_SELECT)
    .eq('lead_id', leadId)
    .order('alterado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapHistorico);
}

export async function deleteHistoricoEtapaLead(leadId: string): Promise<void> {
  const { error } = await supabase
    .from('historico_etapa_lead').delete().eq('lead_id', leadId);
  if (error) throw error;
}

export async function deleteHistoricoEtapaItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('historico_etapa_lead').delete().eq('id', id);
  if (error) throw error;
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, 'etapa' | 'responsavel' | 'proximoFollowUp' | 'observacoes' | 'tags'>>): Promise<void> {
  const p: Record<string, unknown> = {};
  if (patch.etapa !== undefined)           p.etapa            = patch.etapa;
  if (patch.responsavel !== undefined)     p.responsavel      = patch.responsavel;
  if (patch.proximoFollowUp !== undefined) p.proximo_follow_up = patch.proximoFollowUp;
  if (patch.observacoes !== undefined)     p.observacoes      = patch.observacoes;
  if (patch.tags !== undefined)            p.tags             = patch.tags;
  const { error } = await supabase.from('leads').update(p).eq('id', id);
  if (error) throw error;
}

export async function addInteracao(leadId: string, tipo: InteracaoCRM['tipo'], descricao: string, usuario: string): Promise<void> {
  const { error } = await supabase.from('interacoes_crm').insert({ lead_id: leadId, tipo, descricao, usuario });
  if (error) throw error;
  await supabase.from('leads').update({ ultimo_contato: new Date().toISOString().split('T')[0] }).eq('id', leadId);
}

export async function updateLeadClienteId(leadId: string, clienteId: string): Promise<void> {
  const { error } = await supabase.from('leads').update({ cliente_id: clienteId }).eq('id', leadId);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Cria um novo lead ou atualiza o existente pelo e-mail.
 * Tags são mescladas de forma cumulativa (união, não substituição).
 * Gera histórico de etapa com snapshot sempre que a etapa mudar.
 * Retorna o id do lead.
 */
export async function upsertLeadByEmail(l: {
  email: string;
  nome?: string;
  telefone?: string;
  origem?: Lead['origem'];
  etapa: Lead['etapa'];
  interesse?: string;
  planoDesejado?: string;
  tags?: string[];
  observacoes?: string;
  proximoFollowUp?: string;
}): Promise<string> {
  const { data: existing } = await supabase
    .from('leads')
    .select(`id, ${SNAPSHOT_SELECT}`)
    .eq('email', l.email)
    .maybeSingle();

  const hoje = new Date().toISOString().split('T')[0];

  if (existing) {
    const etapaAnterior = (existing as any).etapa as string;
    const tagsExistentes: string[] = (existing as any).tags ?? [];
    const tagsMerge = l.tags?.length
      ? [...new Set([...tagsExistentes, ...l.tags])]
      : undefined;

    const patch: Record<string, unknown> = { etapa: l.etapa, ultimo_contato: hoje };
    if (l.nome)            patch.nome              = l.nome;
    if (l.telefone)        patch.telefone          = l.telefone;
    if (l.interesse)       patch.interesse         = l.interesse;
    if (l.planoDesejado)   patch.plano_desejado    = l.planoDesejado;
    if (tagsMerge)         patch.tags              = tagsMerge;
    if (l.observacoes)     patch.observacoes       = l.observacoes;
    if (l.proximoFollowUp) patch.proximo_follow_up = l.proximoFollowUp;

    await supabase.from('leads').update(patch).eq('id', (existing as any).id);

    if (etapaAnterior !== l.etapa) {
      supabase.from('historico_etapa_lead').insert({
        lead_id:        (existing as any).id,
        etapa_anterior: etapaAnterior,
        etapa_nova:     l.etapa,
        alterado_por:   'checkout',
        alterado_em:    new Date().toISOString(),
        ...buildSnapshot(existing, {
          etapaNova:       l.etapa,
          tags:            tagsMerge,
          observacoes:     l.observacoes,
          interesse:       l.interesse,
          planoDesejado:   l.planoDesejado,
          ultimoContato:   hoje,
          proximoFollowUp: l.proximoFollowUp,
        }),
      }).then(() => {}, () => {});
    }

    return (existing as any).id;
  }

  const novasTags = l.tags ?? [];
  const { data, error } = await supabase.from('leads').insert({
    nome:              l.nome ?? l.email.split('@')[0],
    email:             l.email,
    telefone:          l.telefone,
    origem:            l.origem ?? 'checkout',
    interesse:         l.interesse,
    plano_desejado:    l.planoDesejado,
    etapa:             l.etapa,
    tags:              novasTags,
    observacoes:       l.observacoes,
    proximo_follow_up: l.proximoFollowUp,
    ultimo_contato:    hoje,
  }).select('id').single();
  if (error) throw error;

  supabase.from('historico_etapa_lead').insert({
    lead_id:        data.id,
    etapa_anterior: null,
    etapa_nova:     l.etapa,
    alterado_por:   'checkout',
    alterado_em:    new Date().toISOString(),
    observacoes:    l.observacoes    ?? null,
    origem:         l.origem         ?? 'checkout',
    interesse:      l.interesse      ?? null,
    plano_desejado: l.planoDesejado  ?? null,
    tags:           novasTags,
    ultimo_contato: hoje,
    proximo_follow_up: l.proximoFollowUp ?? null,
  }).then(() => {}, () => {});

  return data.id;
}

/**
 * Atualiza campos de um lead existente pelo id, mesclando tags e gravando
 * histórico de etapa com snapshot se ela mudar.
 */
export async function updateLeadCheckout(
  id: string,
  patch: {
    etapa?: Lead['etapa'];
    nome?: string;
    telefone?: string;
    interesse?: string;
    planoDesejado?: string;
    tags?: string[];
    observacoes?: string;
    proximoFollowUp?: string;
  },
): Promise<void> {
  if (!id) return;

  const { data: atual } = await supabase
    .from('leads')
    .select(`etapa, ${SNAPSHOT_SELECT}`)
    .eq('id', id)
    .single();

  const etapaAnterior    = (atual as any)?.etapa as string | undefined;
  const tagsExistentes: string[] = (atual as any)?.tags ?? [];
  const tagsMerge = patch.tags?.length
    ? [...new Set([...tagsExistentes, ...patch.tags])]
    : undefined;

  const hoje = new Date().toISOString().split('T')[0];
  const update: Record<string, unknown> = { ultimo_contato: hoje };

  if (patch.etapa)           update.etapa              = patch.etapa;
  if (patch.nome)            update.nome               = patch.nome;
  if (patch.telefone)        update.telefone           = patch.telefone;
  if (patch.interesse)       update.interesse          = patch.interesse;
  if (patch.planoDesejado)   update.plano_desejado     = patch.planoDesejado;
  if (tagsMerge)             update.tags               = tagsMerge;
  if (patch.observacoes)     update.observacoes        = patch.observacoes;
  if (patch.proximoFollowUp) update.proximo_follow_up  = patch.proximoFollowUp;

  const { error } = await supabase.from('leads').update(update).eq('id', id);
  if (error) throw error;

  if (patch.etapa && patch.etapa !== etapaAnterior) {
    supabase.from('historico_etapa_lead').insert({
      lead_id:        id,
      etapa_anterior: etapaAnterior ?? null,
      etapa_nova:     patch.etapa,
      alterado_por:   'checkout',
      alterado_em:    new Date().toISOString(),
      ...buildSnapshot(atual, {
        etapaNova:       patch.etapa,
        tags:            tagsMerge,
        observacoes:     patch.observacoes,
        interesse:       patch.interesse,
        planoDesejado:   patch.planoDesejado,
        ultimoContato:   hoje,
        proximoFollowUp: patch.proximoFollowUp,
      }),
    }).then(() => {}, () => {});
  }
}
