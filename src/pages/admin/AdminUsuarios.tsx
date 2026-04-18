import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield, Plus, Edit, Power, KeyRound, Trash2, Check, X,
  AlertTriangle, Crown,
} from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select,
  SectionHeader, SearchBar, Tabs,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS, ALL_PERMISSION_KEYS, ADMIN_ROLES } from '../../lib/permissions';
import {
  listAdminUsers, updateAdminUser, createAdminUser, resetUserPassword,
  type AdminUser,
} from '../../services/users.service';
import {
  getAllRolePermissions, setRolePermissions,
  getUserOverrides, setUserOverrides,
} from '../../services/permissions.service';

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_ROLES.map(r => [r.value, r.label]),
);

export function AdminUsuarios() {
  const { user: currentUser, isMaster, reloadPermissions } = useAuth();
  const [tab, setTab] = useState('usuarios');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create/edit modal
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('atendimento');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Overrides modal (per-user permissions)
  const [overridesModal, setOverridesModal] = useState(false);
  const [overridesUser, setOverridesUser] = useState<AdminUser | null>(null);
  const [overridesRolePerms, setOverridesRolePerms] = useState<string[]>([]);
  const [overridesUserPerms, setOverridesUserPerms] = useState<Map<string, boolean>>(new Map());
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Role permissions matrix
  const [rolePermsMap, setRolePermsMap] = useState<Record<string, string[]>>({});
  const [savingRolePerms, setSavingRolePerms] = useState(false);
  const [rolePermsChanged, setRolePermsChanged] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const list = await listAdminUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    }
    setLoadingUsers(false);
  }, []);

  const loadRolePerms = useCallback(async () => {
    try {
      const map = await getAllRolePermissions();
      setRolePermsMap(map);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { loadUsers(); loadRolePerms(); }, [loadUsers, loadRolePerms]);

  const filtered = users.filter(u =>
    search === '' ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Create/Edit handlers ──
  function openCreateModal() {
    setEditUser(null);
    setFormName(''); setFormEmail(''); setFormPassword('');
    setFormRole('atendimento'); setFormActive(true);
    setSaveError(''); setModal(true);
  }

  function openEditModal(u: AdminUser) {
    setEditUser(u);
    setFormName(u.name); setFormEmail(u.email); setFormPassword('');
    setFormRole(u.role); setFormActive(u.active);
    setSaveError(''); setModal(true);
  }

  async function handleSave() {
    if (!formName.trim() || !formEmail.trim()) {
      setSaveError('Nome e e-mail são obrigatórios.'); return;
    }
    setSaving(true); setSaveError('');
    try {
      if (editUser) {
        const patch: { name?: string; role?: string; active?: boolean } = {};
        if (formName !== editUser.name) patch.name = formName;
        if (formRole !== editUser.role) patch.role = formRole;
        if (formActive !== editUser.active) patch.active = formActive;
        if (Object.keys(patch).length > 0) {
          await updateAdminUser(editUser.id, patch);
        }
      } else {
        if (!formPassword || formPassword.length < 6) {
          setSaveError('Senha deve ter no mínimo 6 caracteres.'); setSaving(false); return;
        }
        await createAdminUser({
          name: formName, email: formEmail,
          password: formPassword, role: formRole,
        });
      }
      await loadUsers();
      setModal(false);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Erro ao salvar.');
    }
    setSaving(false);
  }

  async function handleToggleActive(u: AdminUser) {
    if (u.isMaster) return;
    await updateAdminUser(u.id, { active: !u.active });
    await loadUsers();
  }

  async function handleResetPassword(u: AdminUser) {
    if (!u.email) return;
    if (!confirm(`Enviar e-mail de redefinição de senha para ${u.email}?`)) return;
    try {
      await resetUserPassword(u.email);
      alert('E-mail de redefinição enviado.');
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao enviar e-mail.');
    }
  }

  // ── Per-user overrides ──
  async function openOverridesModal(u: AdminUser) {
    setOverridesUser(u);
    setOverridesRolePerms(rolePermsMap[u.role] ?? []);
    try {
      const ov = await getUserOverrides(u.id);
      const map = new Map<string, boolean>();
      for (const o of ov) map.set(o.permission, o.granted);
      setOverridesUserPerms(map);
    } catch {
      setOverridesUserPerms(new Map());
    }
    setOverridesModal(true);
  }

  function toggleOverride(perm: string) {
    setOverridesUserPerms(prev => {
      const next = new Map(prev);
      const roleHas = overridesRolePerms.includes(perm);
      const currentOverride = next.get(perm);

      if (currentOverride === undefined) {
        next.set(perm, !roleHas);
      } else {
        next.delete(perm);
      }
      return next;
    });
  }

  function isPermEffective(perm: string): boolean {
    const override = overridesUserPerms.get(perm);
    if (override !== undefined) return override;
    return overridesRolePerms.includes(perm);
  }

  async function saveOverrides() {
    if (!overridesUser) return;
    setSavingOverrides(true);
    try {
      const overrides: { permission: string; granted: boolean }[] = [];
      for (const [perm, granted] of overridesUserPerms) {
        overrides.push({ permission: perm, granted });
      }
      await setUserOverrides(overridesUser.id, overrides);
      setOverridesModal(false);
      if (overridesUser.id === currentUser?.id) await reloadPermissions();
    } catch (e) {
      console.error(e);
    }
    setSavingOverrides(false);
  }

  // ── Role permissions matrix ──
  function toggleRolePerm(role: string, perm: string) {
    setRolePermsMap(prev => {
      const current = prev[role] ?? [];
      const has = current.includes(perm);
      return {
        ...prev,
        [role]: has ? current.filter(p => p !== perm) : [...current, perm],
      };
    });
    setRolePermsChanged(true);
  }

  async function saveAllRolePerms() {
    setSavingRolePerms(true);
    try {
      const roles = ADMIN_ROLES.filter(r => r.value !== 'admin').map(r => r.value);
      for (const role of roles) {
        await setRolePermissions(role, rolePermsMap[role] ?? []);
      }
      setRolePermsChanged(false);
      await reloadPermissions();
    } catch (e) {
      console.error(e);
    }
    setSavingRolePerms(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Gestão de Usuários"
        subtitle="Gerencie a equipe, perfis de acesso e permissões"
        action={
          tab === 'usuarios' ? (
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              <Plus size={14} />
              Novo usuário
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { id: 'usuarios', label: 'Equipe', count: users.length },
          { id: 'permissoes', label: 'Permissões por Perfil' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── TAB: Equipe ── */}
      {tab === 'usuarios' && (
        <>
          <div className="flex gap-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome ou e-mail..."
              className="flex-1 max-w-md"
            />
          </div>

          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Usuário</th>
                    <th className="table-th">E-mail</th>
                    <th className="table-th">Perfil</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Criado em</th>
                    <th className="table-th">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td colSpan={6} className="table-td text-center text-charcoal-400 py-8">Carregando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="table-td text-center text-charcoal-400 py-8">Nenhum usuário encontrado</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id} className="border-t border-cream-100 hover:bg-cream-50">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-300 to-earth-500 flex items-center justify-center text-forest-700 text-xs font-editorial shrink-0">
                            {u.name?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal-700 flex items-center gap-1.5">
                              {u.name}
                              {u.isMaster && (
                                <Crown size={12} className="text-gold-500" />
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-charcoal-500">{u.email}</td>
                      <td className="table-td">
                        <Badge variant={u.isMaster ? 'pending' : u.role === 'admin' ? 'active' : undefined}>
                          {u.isMaster ? 'Master' : ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="table-td">
                        <Badge variant={u.active ? 'active' : 'inactive'}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="table-td text-charcoal-500">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          {!u.isMaster && (
                            <>
                              <button
                                title="Editar"
                                className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm"
                                onClick={() => openEditModal(u)}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                title="Permissões individuais"
                                className="p-1.5 text-charcoal-400 hover:text-gold-600 hover:bg-gold-50 rounded-sm"
                                onClick={() => openOverridesModal(u)}
                              >
                                <Shield size={14} />
                              </button>
                              <button
                                title={u.active ? 'Desativar' : 'Reativar'}
                                className={`p-1.5 rounded-sm ${
                                  u.active
                                    ? 'text-charcoal-400 hover:text-red-500 hover:bg-red-50'
                                    : 'text-charcoal-400 hover:text-forest-500 hover:bg-forest-50'
                                }`}
                                onClick={() => handleToggleActive(u)}
                              >
                                <Power size={14} />
                              </button>
                              <button
                                title="Redefinir senha"
                                className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm"
                                onClick={() => handleResetPassword(u)}
                              >
                                <KeyRound size={14} />
                              </button>
                            </>
                          )}
                          {u.isMaster && (
                            <span className="text-xs text-charcoal-300 italic px-2 py-1">Protegido</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── TAB: Permissões por Perfil ── */}
      {tab === 'permissoes' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal-700 font-medium">Matriz de permissões por perfil</p>
              <p className="text-xs text-charcoal-400 mt-0.5">
                O perfil <strong>Administrador</strong> tem acesso total e não pode ser alterado. Configure os demais perfis abaixo.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={saveAllRolePerms}
              disabled={savingRolePerms || !rolePermsChanged}
            >
              {savingRolePerms ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-th sticky left-0 bg-cream-100 z-10 min-w-[140px]">Funcionalidade</th>
                  {ADMIN_ROLES.map(r => (
                    <th key={r.value} className="table-th text-center min-w-[100px]">
                      <span className={r.value === 'admin' ? 'text-forest-600' : ''}>{r.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map(perm => (
                  <tr key={perm.key} className="border-t border-cream-100 hover:bg-cream-50">
                    <td className="table-td sticky left-0 bg-white z-10">
                      <p className="font-medium text-charcoal-700">{perm.label}</p>
                      <p className="text-xs text-charcoal-400">{perm.descricao}</p>
                    </td>
                    {ADMIN_ROLES.map(r => {
                      const isAdmin = r.value === 'admin';
                      const has = isAdmin || (rolePermsMap[r.value] ?? []).includes(perm.key);
                      return (
                        <td key={r.value} className="table-td text-center">
                          <button
                            disabled={isAdmin}
                            onClick={() => !isAdmin && toggleRolePerm(r.value, perm.key)}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-sm transition-colors ${
                              isAdmin
                                ? 'bg-forest-100 text-forest-600 cursor-not-allowed'
                                : has
                                  ? 'bg-forest-500 text-white hover:bg-forest-600'
                                  : 'bg-cream-200 text-charcoal-300 hover:bg-cream-300'
                            }`}
                          >
                            {has ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modal: Criar/Editar Usuário ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <div className="space-y-4">
          <Input
            label="Nome completo"
            required
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="Nome do colaborador"
          />
          <Input
            label="E-mail"
            type="email"
            required
            value={formEmail}
            onChange={e => setFormEmail(e.target.value)}
            placeholder="email@dasmatas.com.br"
            disabled={!!editUser}
          />
          {!editUser && (
            <Input
              label="Senha inicial"
              type="password"
              required
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          )}
          <Select
            label="Perfil de acesso"
            value={formRole}
            onChange={e => setFormRole(e.target.value)}
            options={ADMIN_ROLES.map(r => ({ value: r.value, label: r.label }))}
          />
          {editUser && (
            <div>
              <label className="label-base">Status</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setFormActive(true)}
                  className={`px-3 py-1.5 text-sm rounded-sm border transition-colors ${
                    formActive
                      ? 'bg-forest-500 text-white border-forest-500'
                      : 'bg-white text-charcoal-500 border-cream-300 hover:border-forest-400'
                  }`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => setFormActive(false)}
                  className={`px-3 py-1.5 text-sm rounded-sm border transition-colors ${
                    !formActive
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-charcoal-500 border-cream-300 hover:border-red-400'
                  }`}
                >
                  Inativo
                </button>
              </div>
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {saveError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editUser ? 'Salvar' : 'Criar usuário'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Permissões individuais ── */}
      <Modal
        open={overridesModal}
        onClose={() => setOverridesModal(false)}
        title={`Permissões — ${overridesUser?.name ?? ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-gold-100/50 border border-gold-200 rounded-sm text-sm text-charcoal-600">
            <Shield size={14} className="shrink-0 mt-0.5 text-gold-600" />
            <div>
              Perfil base: <strong>{ROLE_LABELS[overridesUser?.role ?? ''] ?? overridesUser?.role}</strong>.
              Clique para conceder ou revogar permissões individualmente. Alterações se sobrepõem ao perfil base.
            </div>
          </div>

          <div className="space-y-1">
            {PERMISSIONS.map(perm => {
              const effective = isPermEffective(perm.key);
              const hasOverride = overridesUserPerms.has(perm.key);
              const roleHas = overridesRolePerms.includes(perm.key);

              return (
                <button
                  key={perm.key}
                  onClick={() => toggleOverride(perm.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-sm border transition-colors text-left ${
                    effective
                      ? 'bg-forest-50 border-forest-200 text-charcoal-700'
                      : 'bg-cream-50 border-cream-200 text-charcoal-400'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs opacity-60">{perm.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {hasOverride && (
                      <span className="text-[9px] font-mono tracking-wider uppercase text-gold-600 bg-gold-100 px-1.5 py-0.5 rounded-sm">
                        override
                      </span>
                    )}
                    {!hasOverride && roleHas && (
                      <span className="text-[9px] font-mono tracking-wider uppercase text-charcoal-400 bg-cream-200 px-1.5 py-0.5 rounded-sm">
                        perfil
                      </span>
                    )}
                    <div className={`w-6 h-6 rounded-sm flex items-center justify-center ${
                      effective ? 'bg-forest-500 text-white' : 'bg-cream-300 text-charcoal-300'
                    }`}>
                      {effective ? <Check size={14} /> : <X size={14} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setOverridesModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveOverrides} disabled={savingOverrides}>
              {savingOverrides ? 'Salvando...' : 'Salvar permissões'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
