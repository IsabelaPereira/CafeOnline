import { supabase } from '../lib/supabase';
import { ALL_PERMISSION_KEYS } from '../lib/permissions';

export async function getPermissionsForRole(role: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('role', role);
  if (error) throw error;
  return (data ?? []).map(r => r.permission);
}

export async function getUserOverrides(userId: string): Promise<{ permission: string; granted: boolean }[]> {
  const { data, error } = await supabase
    .from('user_permission_overrides')
    .select('permission, granted')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function getEffectivePermissions(role: string, userId: string, isMaster: boolean): Promise<string[]> {
  if (isMaster || role === 'admin') return [...ALL_PERMISSION_KEYS];

  const [rolePerms, overrides] = await Promise.all([
    getPermissionsForRole(role),
    getUserOverrides(userId),
  ]);

  const perms = new Set(rolePerms);
  for (const o of overrides) {
    if (o.granted) perms.add(o.permission);
    else perms.delete(o.permission);
  }
  return [...perms];
}

export async function setRolePermissions(role: string, permissions: string[]): Promise<void> {
  await supabase.from('role_permissions').delete().eq('role', role);
  if (permissions.length === 0) return;
  const rows = permissions.map(p => ({ role, permission: p }));
  const { error } = await supabase.from('role_permissions').insert(rows);
  if (error) throw error;
}

export async function setUserOverrides(
  userId: string,
  overrides: { permission: string; granted: boolean }[],
): Promise<void> {
  await supabase.from('user_permission_overrides').delete().eq('user_id', userId);
  if (overrides.length === 0) return;
  const rows = overrides.map(o => ({ user_id: userId, permission: o.permission, granted: o.granted }));
  const { error } = await supabase.from('user_permission_overrides').insert(rows);
  if (error) throw error;
}

export async function getAllRolePermissions(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.from('role_permissions').select('role, permission');
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const r of data ?? []) {
    (map[r.role] ??= []).push(r.permission);
  }
  return map;
}
