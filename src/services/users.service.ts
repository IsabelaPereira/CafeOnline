import { supabase } from '../lib/supabase';
import type { User } from '../types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  isMaster: boolean;
  active: boolean;
  createdAt: string;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, is_master, active, created_at')
    .neq('role', 'cliente')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const ids = (data ?? []).map(u => u.id);
  let emailMap = new Map<string, string>();
  try {
    const { data: authUsers } = await supabase.rpc('get_user_emails', { user_ids: ids });
    if (authUsers) {
      for (const u of authUsers as { id: string; email: string }[]) {
        emailMap.set(u.id, u.email);
      }
    }
  } catch {
    // RPC may not exist yet
  }

  return (data ?? []).map(u => ({
    id: u.id,
    name: u.name ?? '',
    email: emailMap.get(u.id) ?? '',
    role: u.role as User['role'],
    isMaster: u.is_master ?? false,
    active: u.active ?? true,
    createdAt: u.created_at,
  }));
}

export async function updateAdminUser(
  id: string,
  patch: { name?: string; role?: string; active?: boolean },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<void> {
  // signUp with metadata — the handle_new_user trigger reads name/role from raw_user_meta_data
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { name: data.name, role: data.role },
    },
  });
  if (authErr) throw new Error(authErr.message);
  if (!authData.user) throw new Error('Erro ao criar usuário');

  // Ensure profile has correct role (in case trigger defaulted to 'cliente')
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ name: data.name, role: data.role })
    .eq('id', authData.user.id);
  if (profileErr) throw new Error(profileErr.message);
}

export async function resetUserPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw error;
}
