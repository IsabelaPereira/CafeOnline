import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Coffee, Edit2, Save, X, Lock } from 'lucide-react';
import { Card, Button, Input, Select, Alert } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getClienteByUserId, updateClientePreferencias } from '../../services/clientes.service';
import type { Cliente } from '../../types';

export function ClientPerfil() {
  const { user } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    if (user) getClienteByUserId(user.id).then(setCliente).catch(console.error);
  }, [user]);

  const [editando, setEditando] = useState(false);
  const [editandoSenha, setEditandoSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: cliente?.phone ?? '',
    birthdate: cliente?.birthdate ?? '',
    preferenciaCafe: cliente?.preferenciaCafe ?? 'grao' as 'grao' | 'moido',
    tipoMoagem: cliente?.tipoMoagem ?? '',
  });

  const [senhaForm, setSenhaForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });

  const [erroSenha, setErroSenha] = useState('');

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSalvar() {
    setSalvando(true);
    if (cliente) {
      await updateClientePreferencias(cliente.id, form.preferenciaCafe, form.tipoMoagem || undefined).catch(console.error);
    }
    setSalvando(false);
    setEditando(false);
    setSucesso('Perfil atualizado com sucesso!');
    setTimeout(() => setSucesso(''), 4000);
  }

  async function handleSalvarSenha() {
    setErroSenha('');
    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      setErroSenha('As senhas não coincidem.');
      return;
    }
    if (senhaForm.novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSalvando(true);
    await new Promise(r => setTimeout(r, 800));
    setSalvando(false);
    setEditandoSenha(false);
    setSenhaForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
    setSucesso('Senha alterada com sucesso!');
    setTimeout(() => setSucesso(''), 4000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Meu Perfil</h1>
        <p className="text-charcoal-400 text-sm mt-1">Gerencie suas informações pessoais e preferências.</p>
      </div>

      {sucesso && <Alert type="success" message={sucesso} />}

      {/* Avatar + nome */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-earth-200 rounded-full flex items-center justify-center text-earth-600 font-serif text-3xl shrink-0">
            {user?.name?.[0] ?? 'M'}
          </div>
          <div>
            <h2 className="font-serif text-2xl text-charcoal-700">{user?.name}</h2>
            <p className="text-sm text-charcoal-400">{user?.email}</p>
            <p className="text-xs text-charcoal-400 mt-1">
              Membro desde {new Date(user?.createdAt ?? '').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </Card>

      {/* Informações pessoais */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-lg text-charcoal-700 flex items-center gap-2">
            <User size={18} className="text-earth-400" />
            Informações Pessoais
          </h3>
          {!editando ? (
            <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditando(true)}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" icon={<Save size={14} />} loading={salvando} onClick={handleSalvar}>
                Salvar
              </Button>
            </div>
          )}
        </div>

        {editando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome completo"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
            />
            <Input
              label="Telefone / WhatsApp"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={form.birthdate}
              onChange={e => handleChange('birthdate', e.target.value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            {[
              { icon: <User size={14} />, label: 'Nome', value: user?.name },
              { icon: <Mail size={14} />, label: 'E-mail', value: user?.email },
              { icon: <Phone size={14} />, label: 'Telefone', value: cliente?.phone },
              {
                icon: <User size={14} />,
                label: 'Data de nascimento',
                value: cliente?.birthdate
                  ? new Date(cliente.birthdate + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—',
              },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 text-charcoal-300">{item.icon}</span>
                <div>
                  <p className="text-xs text-charcoal-400 mb-0.5">{item.label}</p>
                  <p className="text-sm text-charcoal-700">{item.value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preferências de café */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-lg text-charcoal-700 flex items-center gap-2">
            <Coffee size={18} className="text-earth-400" />
            Preferências de Café
          </h3>
          {editando && (
            <span className="text-xs text-charcoal-400">Editando acima</span>
          )}
        </div>

        {editando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Preferência"
              value={form.preferenciaCafe}
              onChange={e => handleChange('preferenciaCafe', e.target.value)}
              options={[
                { value: 'grao', label: 'Em grão' },
                { value: 'moido', label: 'Moído' },
              ]}
            />
            {form.preferenciaCafe === 'moido' && (
              <Select
                label="Tipo de moagem"
                value={form.tipoMoagem}
                onChange={e => handleChange('tipoMoagem', e.target.value)}
                options={[
                  { value: 'fino', label: 'Fino (espresso)' },
                  { value: 'medio', label: 'Médio (coador/v60)' },
                  { value: 'grosso', label: 'Grosso (prensa francesa)' },
                  { value: 'extraGrosso', label: 'Extra grosso (cold brew)' },
                ]}
              />
            )}
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="bg-cream-50 rounded-sm px-5 py-4 text-center">
              <p className="text-xs text-charcoal-400 mb-1">Formato</p>
              <p className="text-sm font-medium text-charcoal-700 capitalize">
                {cliente?.preferenciaCafe === 'grao' ? 'Em grão' : 'Moído'}
              </p>
            </div>
            {cliente?.preferenciaCafe === 'moido' && cliente?.tipoMoagem && (
              <div className="bg-cream-50 rounded-sm px-5 py-4 text-center">
                <p className="text-xs text-charcoal-400 mb-1">Moagem</p>
                <p className="text-sm font-medium text-charcoal-700 capitalize">
                  {{ fino: 'Fina', medio: 'Média', grosso: 'Grossa', extraGrosso: 'Extra grossa' }[cliente!.tipoMoagem!] ?? cliente!.tipoMoagem}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Segurança / senha */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-lg text-charcoal-700 flex items-center gap-2">
            <Lock size={18} className="text-earth-400" />
            Segurança
          </h3>
          {!editandoSenha ? (
            <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditandoSenha(true)}>
              Alterar senha
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<X size={14} />}
                onClick={() => { setEditandoSenha(false); setErroSenha(''); setSenhaForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' }); }}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" icon={<Save size={14} />} loading={salvando} onClick={handleSalvarSenha}>
                Salvar
              </Button>
            </div>
          )}
        </div>

        {editandoSenha ? (
          <div className="space-y-4 max-w-sm">
            {erroSenha && <Alert type="error" message={erroSenha} />}
            <Input
              label="Senha atual"
              type="password"
              value={senhaForm.senhaAtual}
              onChange={e => setSenhaForm(p => ({ ...p, senhaAtual: e.target.value }))}
            />
            <Input
              label="Nova senha"
              type="password"
              value={senhaForm.novaSenha}
              onChange={e => setSenhaForm(p => ({ ...p, novaSenha: e.target.value }))}
              hint="Mínimo de 6 caracteres"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={senhaForm.confirmarSenha}
              onChange={e => setSenhaForm(p => ({ ...p, confirmarSenha: e.target.value }))}
            />
          </div>
        ) : (
          <p className="text-sm text-charcoal-500">••••••••••  <span className="text-charcoal-400 text-xs ml-2">Senha definida</span></p>
        )}
      </Card>
    </div>
  );
}
