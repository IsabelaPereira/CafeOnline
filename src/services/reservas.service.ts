import { supabase } from '../lib/supabase';
import type { Reserva, Mesa, DiaFechado } from '../types';

function mapReserva(r: any): Reserva {
  return {
    id: r.id, nome: r.nome, email: r.email, telefone: r.telefone ?? '',
    data: r.data, horario: r.horario, pessoas: r.pessoas,
    duracaoMins: r.duracao_mins ?? 90,
    mesaId: r.mesa_id ?? undefined,
    mesasAlocadas: r.mesas_alocadas ?? [],
    status: r.status as Reserva['status'],
    observacoes: r.observacoes ?? undefined,
    observacoesInternas: r.observacoes_internas ?? undefined,
    clienteId: r.cliente_id ?? undefined,
    leadId: r.lead_id ?? undefined,
    createdAt: r.created_at,
  };
}

function mapMesa(r: any): Mesa {
  return {
    id: r.id, numero: r.numero, nome: r.nome ?? undefined,
    capacidade: r.capacidade, ativa: r.ativa, descricao: r.descricao ?? undefined,
  };
}

// ── Reservas ──────────────────────────────────────────────────────────────────

export async function getReservas(data?: string): Promise<Reserva[]> {
  let q = supabase.from('reservas').select('*').order('data').order('horario');
  if (data) q = q.eq('data', data);
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows ?? []).map(mapReserva);
}

export async function getReservasCliente(clienteId: string): Promise<Reserva[]> {
  const { data, error } = await supabase
    .from('reservas').select('*')
    .eq('cliente_id', clienteId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReserva);
}

export async function createReserva(r: Omit<Reserva, 'id' | 'createdAt'>): Promise<Reserva> {
  // Insere sem .select() para não depender de policy de leitura (funciona para usuários anônimos)
  const { error } = await supabase.from('reservas').insert({
    nome: r.nome, email: r.email, telefone: r.telefone, data: r.data,
    horario: r.horario, pessoas: r.pessoas, mesa_id: r.mesaId,
    duracao_mins: r.duracaoMins ?? 90,
    mesas_alocadas: r.mesasAlocadas ?? [],
    observacoes: r.observacoes, status: r.status ?? 'solicitada',
  });
  if (error) throw error;
  // Retorna objeto local suficiente para uso imediato (sem round-trip de leitura)
  return {
    id: '', nome: r.nome, email: r.email, telefone: r.telefone,
    data: r.data, horario: r.horario, pessoas: r.pessoas,
    duracaoMins: r.duracaoMins ?? 90, mesasAlocadas: r.mesasAlocadas ?? [],
    mesaId: r.mesaId, status: r.status ?? 'solicitada',
    observacoes: r.observacoes, createdAt: new Date().toISOString(),
  };
}

export async function updateReservaStatus(
  id: string,
  status: Reserva['status'],
  obs?: string,
  mesasAlocadas?: string[],
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (obs !== undefined)           patch.observacoes_internas = obs;
  if (mesasAlocadas !== undefined) patch.mesas_alocadas = mesasAlocadas;
  const { error } = await supabase.from('reservas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updateReservaMesas(id: string, mesasAlocadas: string[]): Promise<void> {
  const { error } = await supabase.from('reservas')
    .update({ mesas_alocadas: mesasAlocadas }).eq('id', id);
  if (error) throw error;
}

export async function atribuirMesa(id: string, mesaId: string): Promise<void> {
  const { error } = await supabase.from('reservas').update({ mesa_id: mesaId }).eq('id', id);
  if (error) throw error;
}

// ── Mesas ─────────────────────────────────────────────────────────────────────

export async function getMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase.from('mesas').select('*').order('numero');
  if (error) throw error;
  return (data ?? []).map(mapMesa);
}

export async function createMesa(m: { numero: string; nome?: string; capacidade: number; descricao?: string }): Promise<Mesa> {
  const { data, error } = await supabase.from('mesas').insert({
    numero: m.numero, nome: m.nome || null, capacidade: m.capacidade, descricao: m.descricao || null, ativa: true,
  }).select().single();
  if (error) throw error;
  return mapMesa(data);
}

export async function updateMesa(id: string, patch: Partial<Mesa>): Promise<void> {
  const p: Record<string, unknown> = {};
  if (patch.ativa      !== undefined) p.ativa      = patch.ativa;
  if (patch.descricao  !== undefined) p.descricao  = patch.descricao  || null;
  if (patch.nome       !== undefined) p.nome       = patch.nome       || null;
  if (patch.numero     !== undefined) p.numero     = patch.numero;
  if (patch.capacidade !== undefined) p.capacidade = patch.capacidade;
  const { error } = await supabase.from('mesas').update(p).eq('id', id);
  if (error) throw error;
}

export async function deleteMesa(id: string): Promise<void> {
  // Remove o id do array mesas_alocadas em todas as reservas que o contêm
  const { data: comMesa } = await supabase.from('reservas')
    .select('id, mesas_alocadas')
    .contains('mesas_alocadas', [id]);
  if (comMesa?.length) {
    await Promise.all(comMesa.map(r =>
      supabase.from('reservas').update({
        mesas_alocadas: (r.mesas_alocadas as string[]).filter((mid: string) => mid !== id),
      }).eq('id', r.id)
    ));
  }
  // mesa_id é zerado automaticamente pelo ON DELETE SET NULL (migration 020)
  const { error } = await supabase.from('mesas').delete().eq('id', id);
  if (error) throw error;
}

// ── Dias fechados ─────────────────────────────────────────────────────────────

export async function getDiasFechados(): Promise<DiaFechado[]> {
  const { data, error } = await supabase.from('dias_fechados').select('*').order('data');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, data: r.data, motivo: r.motivo ?? undefined, createdAt: r.created_at }));
}

export async function createDiaFechado(data: string, motivo?: string): Promise<DiaFechado> {
  const { data: row, error } = await supabase.from('dias_fechados')
    .insert({ data, motivo: motivo || null }).select().single();
  if (error) throw error;
  return { id: row.id, data: row.data, motivo: row.motivo ?? undefined, createdAt: row.created_at };
}

export async function updateDiaFechado(id: string, data: string, motivo?: string): Promise<void> {
  const { error } = await supabase.from('dias_fechados')
    .update({ data, motivo: motivo || null }).eq('id', id);
  if (error) throw error;
}

export async function deleteDiaFechado(id: string): Promise<void> {
  const { error } = await supabase.from('dias_fechados').delete().eq('id', id);
  if (error) throw error;
}

// ── Alocação automática de mesas ──────────────────────────────────────────────

/**
 * Retorna os IDs das mesas disponíveis no horário especificado, excluindo
 * as que já estão alocadas em reservas confirmadas com sobreposição de horário.
 */
export function mesasDisponiveis(
  mesas: Mesa[],
  reservas: Reserva[],
  data: string,
  horario: string,
  duracaoMins: number,
  excluirReservaId?: string,
): Mesa[] {
  const [hH, hM] = horario.split(':').map(Number);
  const inicioMin = hH * 60 + hM;
  const fimMin    = inicioMin + duracaoMins;

  const ocupadas = new Set<string>();
  for (const r of reservas) {
    if (r.id === excluirReservaId) continue;
    if (r.data !== data)            continue;
    if (r.status === 'cancelada' || r.status === 'recusada') continue;
    const [rH, rM] = r.horario.split(':').map(Number);
    const rIni = rH * 60 + rM;
    const rFim = rIni + (r.duracaoMins ?? 90);
    if (inicioMin < rFim && fimMin > rIni) {
      r.mesasAlocadas.forEach(id => ocupadas.add(id));
    }
  }

  return mesas.filter(m => m.ativa && !ocupadas.has(m.id));
}

/**
 * Sugere a combinação mínima de mesas que acomoda `pessoas`.
 * Retorna array de IDs.
 */
export function sugerirAlocacao(disponiveis: Mesa[], pessoas: number): string[] {
  // Tenta mesa única
  const single = disponiveis
    .filter(m => m.capacidade >= pessoas)
    .sort((a, b) => a.capacidade - b.capacidade)[0];
  if (single) return [single.id];

  // Combina mesas (greedy: maiores primeiro)
  const sorted = [...disponiveis].sort((a, b) => b.capacidade - a.capacidade);
  const combo: string[] = [];
  let cap = 0;
  for (const m of sorted) {
    combo.push(m.id);
    cap += m.capacidade;
    if (cap >= pessoas) break;
  }
  return combo;
}
