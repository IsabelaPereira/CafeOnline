import { supabase } from '../lib/supabase';
import type { Reserva, Mesa } from '../types';

function mapReserva(r: any): Reserva {
  return {
    id: r.id, nome: r.nome, email: r.email, telefone: r.telefone ?? '',
    data: r.data, horario: r.horario, pessoas: r.pessoas,
    mesaId: r.mesa_id ?? undefined, status: r.status as Reserva['status'],
    observacoes: r.observacoes ?? undefined, observacoesInternas: r.observacoes_internas ?? undefined,
    clienteId: r.cliente_id ?? undefined, leadId: r.lead_id ?? undefined,
    createdAt: r.created_at,
  };
}

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
  const { data, error } = await supabase.from('reservas').insert({
    nome: r.nome, email: r.email, telefone: r.telefone, data: r.data,
    horario: r.horario, pessoas: r.pessoas, mesa_id: r.mesaId,
    observacoes: r.observacoes, status: 'solicitada',
  }).select().single();
  if (error) throw error;
  return mapReserva(data);
}

export async function updateReservaStatus(id: string, status: Reserva['status'], obs?: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (obs !== undefined) patch.observacoes_internas = obs;
  const { error } = await supabase.from('reservas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function atribuirMesa(id: string, mesaId: string): Promise<void> {
  const { error } = await supabase.from('reservas').update({ mesa_id: mesaId }).eq('id', id);
  if (error) throw error;
}

export async function getMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase.from('mesas').select('*').order('numero');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, numero: r.numero, capacidade: r.capacidade, ativa: r.ativa, descricao: r.descricao ?? undefined }));
}

export async function updateMesa(id: string, patch: Partial<Mesa>): Promise<void> {
  const p: Record<string, unknown> = {};
  if (patch.ativa !== undefined)     p.ativa = patch.ativa;
  if (patch.descricao !== undefined) p.descricao = patch.descricao;
  if (patch.capacidade !== undefined) p.capacidade = patch.capacidade;
  const { error } = await supabase.from('mesas').update(p).eq('id', id);
  if (error) throw error;
}
