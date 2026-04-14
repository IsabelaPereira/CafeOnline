import { supabase } from '../lib/supabase';
import type { Lead, InteracaoCRM } from '../types';

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

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, interacoes:interacoes_crm(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads').select('*, interacoes:interacoes_crm(*)').eq('id', id).single();
  if (error) return null;
  return mapLead(data);
}

export async function createLead(l: { nome: string; email: string; telefone?: string; origem?: Lead['origem']; interesse?: string; planoDesejado?: string }): Promise<Lead> {
  // Evitar duplicata de e-mail
  const { data: existing } = await supabase.from('leads').select('id').eq('email', l.email).maybeSingle();
  if (existing) return getLead(existing.id) as Promise<Lead>;

  const { data, error } = await supabase.from('leads').insert({
    nome: l.nome, email: l.email, telefone: l.telefone, origem: l.origem ?? 'landing',
    interesse: l.interesse, plano_desejado: l.planoDesejado, etapa: 'novo',
  }).select().single();
  if (error) throw error;
  return mapLead(data);
}

export async function updateLeadEtapa(id: string, etapa: Lead['etapa']): Promise<void> {
  const { error } = await supabase.from('leads').update({ etapa, ultimo_contato: new Date().toISOString().split('T')[0] }).eq('id', id);
  if (error) throw error;
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, 'etapa' | 'responsavel' | 'proximoFollowUp' | 'observacoes' | 'tags'>>): Promise<void> {
  const p: Record<string, unknown> = {};
  if (patch.etapa !== undefined)          p.etapa = patch.etapa;
  if (patch.responsavel !== undefined)    p.responsavel = patch.responsavel;
  if (patch.proximoFollowUp !== undefined) p.proximo_follow_up = patch.proximoFollowUp;
  if (patch.observacoes !== undefined)    p.observacoes = patch.observacoes;
  if (patch.tags !== undefined)           p.tags = patch.tags;
  const { error } = await supabase.from('leads').update(p).eq('id', id);
  if (error) throw error;
}

export async function addInteracao(leadId: string, tipo: InteracaoCRM['tipo'], descricao: string, usuario: string): Promise<void> {
  const { error } = await supabase.from('interacoes_crm').insert({ lead_id: leadId, tipo, descricao, usuario });
  if (error) throw error;
  await supabase.from('leads').update({ ultimo_contato: new Date().toISOString().split('T')[0] }).eq('id', leadId);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}
