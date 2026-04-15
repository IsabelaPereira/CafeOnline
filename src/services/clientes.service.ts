import { supabase } from '../lib/supabase';
import type { Cliente, Endereco } from '../types';

function mapEndereco(r: any): Endereco {
  return { id: r.id, apelido: r.apelido ?? undefined, cep: r.cep, logradouro: r.logradouro, numero: r.numero, complemento: r.complemento ?? undefined, bairro: r.bairro, cidade: r.cidade, estado: r.estado, padrao: r.padrao };
}

function mapCliente(r: any): Cliente {
  return {
    id: r.id, userId: r.user_id ?? '',
    name: r.profile?.name ?? r.nome ?? '', email: r.profile?.email ?? r.email ?? '',
    phone: r.phone ?? '', cpf: r.cpf ?? undefined, birthdate: r.birthdate ?? undefined,
    preferenciaCafe: r.preferencia_cafe as 'grao' | 'moido',
    tipoMoagem: r.tipo_moagem ?? undefined,
    stripeCardBrand:  r.stripe_card_brand  ?? undefined,
    stripeCardLast4:  r.stripe_card_last4  ?? undefined,
    stripeCardExpiry: r.stripe_card_expiry ?? undefined,
    enderecos: (r.enderecos ?? []).map(mapEndereco),
    assinaturas: [], pedidos: [],
    createdAt: r.created_at,
  };
}

// Colunas base sem embedded joins — evita bug do Supabase JS que remove o primeiro
// item do select quando há embedded resources (enderecos, profiles).
const BASE_COLS = 'phone, id, user_id, cpf, birthdate, preferencia_cafe, tipo_moagem, nome, email, created_at';

/** Busca cliente + endereços em queries separadas para evitar bug do Supabase JS. */
async function fetchClienteComEnderecos(row: any): Promise<Cliente> {
  const { data: enderecos } = await supabase
    .from('enderecos')
    .select('*')
    .eq('cliente_id', row.id)
    .order('padrao', { ascending: false });

  return mapCliente({ ...row, enderecos: enderecos ?? [] });
}

export async function getClientes(): Promise<Cliente[]> {
  // Para listagem admin: usa join de profiles (panel admin já rodou as migrations)
  const { data, error } = await supabase
    .from('clientes')
    .select('phone, id, user_id, cpf, birthdate, preferencia_cafe, tipo_moagem, nome, email, created_at, profile:profiles(name, email), enderecos(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCliente);
}

export async function getClienteByUserId(userId: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select(BASE_COLS)
    .eq('user_id', userId)
    .single();
  if (error) return null;

  // Tenta ler colunas Stripe separadamente (existem após migrations 004/007)
  let stripeExtra: Record<string, string | null> = {};
  try {
    const { data: extra } = await supabase
      .from('clientes')
      .select('stripe_customer_id, stripe_card_brand, stripe_card_last4, stripe_card_expiry')
      .eq('id', data.id)
      .single();
    stripeExtra = (extra as any) ?? {};
  } catch { /* colunas ainda não existem */ }

  return fetchClienteComEnderecos({ ...data, ...stripeExtra });
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select(BASE_COLS)
    .eq('id', id)
    .single();
  if (error) return null;
  return fetchClienteComEnderecos(data);
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

export async function updateCliente(
  id: string,
  userId: string,
  patch: {
    name?: string;
    phone?: string;
    cpf?: string;
    birthdate?: string;
    preferenciaCafe?: 'grao' | 'moido';
    tipoMoagem?: string;
  },
): Promise<void> {
  const clientePatch: Record<string, unknown> = {};
  if (patch.phone !== undefined)           clientePatch.phone            = patch.phone || null;
  if (patch.cpf !== undefined)             clientePatch.cpf              = patch.cpf || null;
  if (patch.birthdate !== undefined)       clientePatch.birthdate        = patch.birthdate || null;
  if (patch.preferenciaCafe !== undefined) clientePatch.preferencia_cafe = patch.preferenciaCafe;
  if (patch.tipoMoagem !== undefined)      clientePatch.tipo_moagem      = patch.tipoMoagem || null;
  if (Object.keys(clientePatch).length > 0) {
    const { error } = await supabase.from('clientes').update(clientePatch).eq('id', id);
    if (error) throw error;
  }
  if (patch.name?.trim() && userId) {
    const { error } = await supabase.from('profiles').update({ name: patch.name.trim() }).eq('id', userId);
    if (error) throw error;
  }
}

/**
 * Cria um cliente a partir de um lead convertido manualmente pelo admin.
 * Não requer conta de autenticação (user_id = null).
 * Nome e e-mail são guardados nas colunas fallback da tabela clientes.
 */
export async function createClienteFromLead(c: {
  nome: string;
  email: string;
  phone?: string;
  cpf?: string;
  birthdate?: string;
  preferenciaCafe: 'grao' | 'moido';
  tipoMoagem?: string;
}): Promise<string> {
  const { data, error } = await supabase.from('clientes').insert({
    user_id:          null,
    nome:             c.nome,
    email:            c.email,
    phone:            c.phone   || null,
    cpf:              c.cpf     || null,
    birthdate:        c.birthdate || null,
    preferencia_cafe: c.preferenciaCafe,
    tipo_moagem:      c.tipoMoagem || null,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateClienteStripeCustomerId(clienteId: string, stripeCustomerId: string): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', clienteId);
  if (error) throw error;
}
