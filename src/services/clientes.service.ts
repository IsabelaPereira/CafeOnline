import { supabase } from '../lib/supabase';
import type { Cliente, Endereco } from '../types';

function mapEndereco(r: any): Endereco {
  return { id: r.id, apelido: r.apelido ?? undefined, cep: r.cep, logradouro: r.logradouro, numero: r.numero, complemento: r.complemento ?? undefined, bairro: r.bairro, cidade: r.cidade, estado: r.estado, padrao: r.padrao };
}

function mapCliente(r: any): Cliente {
  return {
    id: r.id, userId: r.user_id ?? '',
    name: r.profile?.name ?? '', email: r.profile?.email ?? '',
    phone: r.phone ?? '', cpf: r.cpf ?? undefined, birthdate: r.birthdate ?? undefined,
    preferenciaCafe: r.preferencia_cafe as 'grao' | 'moido',
    tipoMoagem: r.tipo_moagem ?? undefined,
    enderecos: (r.enderecos ?? []).map(mapEndereco),
    assinaturas: [], pedidos: [],
    createdAt: r.created_at,
  };
}

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, profile:profiles(name, email), enderecos(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCliente);
}

export async function getClienteByUserId(userId: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, profile:profiles(name, email), enderecos(*)')
    .eq('user_id', userId).single();
  if (error) return null;
  return mapCliente(data);
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, profile:profiles(name, email), enderecos(*)')
    .eq('id', id).single();
  if (error) return null;
  return mapCliente(data);
}

export async function createCliente(c: { userId: string; phone?: string; cpf?: string; preferenciaCafe?: 'grao' | 'moido'; tipoMoagem?: string }): Promise<string> {
  const { data, error } = await supabase.from('clientes').insert({
    user_id: c.userId, phone: c.phone, cpf: c.cpf,
    preferencia_cafe: c.preferenciaCafe ?? 'grao', tipo_moagem: c.tipoMoagem,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateClientePreferencias(id: string, preferenciaCafe: 'grao' | 'moido', tipoMoagem?: string): Promise<void> {
  const { error } = await supabase.from('clientes').update({ preferencia_cafe: preferenciaCafe, tipo_moagem: tipoMoagem ?? null }).eq('id', id);
  if (error) throw error;
}

// ---- Endereços ----
export async function getEnderecos(clienteId: string): Promise<Endereco[]> {
  const { data, error } = await supabase.from('enderecos').select('*').eq('cliente_id', clienteId).order('padrao', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEndereco);
}

export async function createEndereco(clienteId: string, e: Omit<Endereco, 'id'>): Promise<Endereco> {
  if (e.padrao) {
    await supabase.from('enderecos').update({ padrao: false }).eq('cliente_id', clienteId);
  }
  const { data, error } = await supabase.from('enderecos').insert({
    cliente_id: clienteId, apelido: e.apelido, cep: e.cep, logradouro: e.logradouro,
    numero: e.numero, complemento: e.complemento, bairro: e.bairro, cidade: e.cidade,
    estado: e.estado, padrao: e.padrao,
  }).select().single();
  if (error) throw error;
  return mapEndereco(data);
}

export async function updateEndereco(id: string, clienteId: string, e: Partial<Omit<Endereco, 'id'>>): Promise<void> {
  if (e.padrao) {
    await supabase.from('enderecos').update({ padrao: false }).eq('cliente_id', clienteId);
  }
  const p: Record<string, unknown> = {};
  if (e.apelido !== undefined)     p.apelido = e.apelido;
  if (e.cep !== undefined)         p.cep = e.cep;
  if (e.logradouro !== undefined)  p.logradouro = e.logradouro;
  if (e.numero !== undefined)      p.numero = e.numero;
  if (e.complemento !== undefined) p.complemento = e.complemento;
  if (e.bairro !== undefined)      p.bairro = e.bairro;
  if (e.cidade !== undefined)      p.cidade = e.cidade;
  if (e.estado !== undefined)      p.estado = e.estado;
  if (e.padrao !== undefined)      p.padrao = e.padrao;
  const { error } = await supabase.from('enderecos').update(p).eq('id', id);
  if (error) throw error;
}

export async function deleteEndereco(id: string): Promise<void> {
  const { error } = await supabase.from('enderecos').delete().eq('id', id);
  if (error) throw error;
}

export async function definirEnderecoPadrao(id: string, clienteId: string): Promise<void> {
  await supabase.from('enderecos').update({ padrao: false }).eq('cliente_id', clienteId);
  const { error } = await supabase.from('enderecos').update({ padrao: true }).eq('id', id);
  if (error) throw error;
}
