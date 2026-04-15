import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Users, Plus, CheckCircle, XCircle, AlertCircle, ChevronRight, UserCheck } from 'lucide-react';
import { Card, Button, Input, Alert } from '../../components/ui';
import { useCliente } from '../../hooks/useCliente';
import { useAuth } from '../../contexts/AuthContext';
import { getReservasCliente, createReserva } from '../../services/reservas.service';
import { getConfiguracoes } from '../../services/configuracoes.service';
import type { Reserva } from '../../types';

const STATUS_CONFIG: Record<Reserva['status'], { label: string; color: string; icon: React.ReactNode }> = {
  solicitada:  { label: 'Solicitada',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200',   icon: <AlertCircle size={14} /> },
  confirmada:  { label: 'Confirmada',  color: 'bg-forest-50 text-forest-700 border-forest-200',   icon: <CheckCircle size={14} /> },
  concluida:   { label: 'Concluída',   color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <CheckCircle size={14} /> },
  cancelada:   { label: 'Cancelada',   color: 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle size={14} /> },
  recusada:    { label: 'Recusada',    color: 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle size={14} /> },
  no_show:     { label: 'Não compareceu', color: 'bg-charcoal-50 text-charcoal-500 border-cream-200', icon: <XCircle size={14} /> },
};

interface FormReserva {
  nome: string;
  email: string;
  telefone: string;
  data: string;
  horario: string;
  pessoas: string;
  duracaoMins: string;
  observacoes: string;
}

const defaultForm = (): FormReserva => ({
  nome: '', email: '', telefone: '', data: '', horario: '',
  pessoas: '2', duracaoMins: '90', observacoes: '',
});

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="w-full border border-cream-200 bg-cream-50 rounded-sm px-3 py-2.5 text-sm text-charcoal-600 select-all">
        {value || <span className="text-charcoal-300">—</span>}
      </div>
    </div>
  );
}

export function ClientReservas() {
  const { cliente } = useCliente();
  const { user } = useAuth();

  const [tab, setTab] = useState<'nova' | 'minhas'>('nova');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);

  const [form, setForm] = useState<FormReserva>(defaultForm());
  const [horarios, setHorarios] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  // Pré-preenche quando cliente ou user carregarem
  // cliente.name/email podem vir vazios (armazenados em profiles, não em clientes)
  // — usa user.name/email do auth context como fallback garantido
  useEffect(() => {
    setForm(f => ({
      ...f,
      nome:     cliente?.name  || user?.name  || f.nome,
      email:    cliente?.email || user?.email || f.email,
      telefone: cliente?.phone || f.telefone,
    }));
  }, [cliente?.id, user?.id]);

  // Carrega horários da configuração
  useEffect(() => {
    getConfiguracoes().catch(() => null).then(config => {
      if (!config) return;
      const lista: string[] = [];
      (config.cafeteria?.horarios ?? []).forEach((h: any) => {
        if (h.fechado) return;
        ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'].forEach(hr => {
          const [hh] = hr.split(':').map(Number);
          const [ah] = (h.abertura ?? '09:00').split(':').map(Number);
          const [fh] = (h.fechamento ?? '18:00').split(':').map(Number);
          if (hh >= ah && hh < fh && !lista.includes(hr)) lista.push(hr);
        });
      });
      if (lista.length > 0) setHorarios(lista.sort());
    });
  }, []);

  // Carrega reservas do cliente ao trocar para aba "Minhas"
  useEffect(() => {
    if (tab !== 'minhas' || !cliente) return;
    setLoadingReservas(true);
    getReservasCliente(cliente.id)
      .then(setReservas)
      .catch(() => {})
      .finally(() => setLoadingReservas(false));
  }, [tab, cliente]);

  const today = new Date().toISOString().split('T')[0];

  const field = (label: string, key: keyof FormReserva, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <Input
      label={label}
      value={form[key]}
      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      {...props}
    />
  );

  const handleSubmit = async () => {
    if (!form.nome || !form.email || !form.data || !form.horario || !form.pessoas) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    setErro('');
    setSubmitting(true);
    try {
      await createReserva({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        data: form.data,
        horario: form.horario,
        pessoas: Number(form.pessoas),
        duracaoMins: Number(form.duracaoMins),
        mesasAlocadas: [],
        status: 'solicitada',
        observacoes: form.observacoes || undefined,
        clienteId: cliente?.id,
      });
      setSucesso(true);
      setForm(f => ({ ...defaultForm(), nome: f.nome, email: f.email, telefone: f.telefone }));
      // Atualiza lista
      if (cliente) getReservasCliente(cliente.id).then(setReservas).catch(() => {});
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao criar reserva. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const hoje = new Date();
  const reservasAtivas = reservas.filter(r =>
    r.status !== 'cancelada' && r.status !== 'recusada' && r.status !== 'concluida' && r.status !== 'no_show'
    && new Date(r.data) >= hoje
  );
  const reservasPassadas = reservas.filter(r =>
    r.status === 'concluida' || r.status === 'cancelada' || r.status === 'recusada' || r.status === 'no_show'
    || new Date(r.data) < hoje
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Reservas</h1>
        <p className="text-charcoal-400 text-sm mt-1">Reserve uma mesa no café Das Matas.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cream-200">
        {(['nova', 'minhas'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSucesso(false); }}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              tab === t
                ? 'text-forest-600 border-b-2 border-forest-500'
                : 'text-charcoal-400 hover:text-charcoal-600'
            }`}
          >
            {t === 'nova' ? (
              <span className="flex items-center gap-1.5"><Plus size={14} />Nova reserva</span>
            ) : (
              <span className="flex items-center gap-1.5"><Calendar size={14} />Minhas reservas</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Nova reserva ── */}
      {tab === 'nova' && (
        <Card>
          {sucesso ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-forest-500" />
              </div>
              <h3 className="font-serif text-xl text-charcoal-700 mb-2">Reserva solicitada!</h3>
              <p className="text-sm text-charcoal-500 mb-6">
                Sua reserva foi enviada e será confirmada em breve. Você pode acompanhá-la em "Minhas reservas".
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => { setSucesso(false); }}>Nova reserva</Button>
                <Button variant="primary" onClick={() => setTab('minhas')}>
                  Ver minhas reservas <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Dados do perfil — somente leitura */}
              {cliente && (
                <div className="flex items-center gap-2 p-3 bg-forest-50 border border-forest-100 rounded-sm">
                  <UserCheck size={15} className="text-forest-500 shrink-0" />
                  <p className="text-xs text-forest-700">
                    Reserva vinculada ao seu perfil. Dados preenchidos automaticamente.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReadonlyField label="Nome" value={form.nome} />
                <ReadonlyField label="E-mail" value={form.email} />
              </div>
              <ReadonlyField label="Telefone / WhatsApp" value={form.telefone || '—'} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Data *', 'data', { type: 'date', min: today })}

                {horarios.length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                      Horário *
                    </label>
                    <select
                      value={form.horario}
                      onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                      className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
                    >
                      <option value="">Selecionar horário</option>
                      {horarios.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  field('Horário *', 'horario', { type: 'time', placeholder: '19:00' })
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                    Número de pessoas *
                  </label>
                  <select
                    value={form.pessoas}
                    onChange={e => setForm(f => ({ ...f, pessoas: e.target.value }))}
                    className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
                  >
                    {[1,2,3,4,5,6,7,8,10,12].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'pessoa' : 'pessoas'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                    Duração estimada
                  </label>
                  <select
                    value={form.duracaoMins}
                    onChange={e => setForm(f => ({ ...f, duracaoMins: e.target.value }))}
                    className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
                  >
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 horas</option>
                    <option value="150">2h 30min</option>
                    <option value="180">3 horas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                  Observações (opcional)
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Alguma preferência ou necessidade especial?"
                  className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
                />
              </div>

              {erro && <Alert type="error" message={erro} />}

              <Button
                variant="primary"
                loading={submitting}
                onClick={handleSubmit}
                disabled={!form.nome || !form.email || !form.data || !form.horario}
              >
                <Calendar size={14} />
                Solicitar reserva
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ── Minhas reservas ── */}
      {tab === 'minhas' && (
        <div className="space-y-6">
          {loadingReservas ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reservas.length === 0 ? (
            <Card className="py-12 text-center">
              <Calendar size={36} className="text-charcoal-200 mx-auto mb-3" />
              <p className="font-serif text-lg text-charcoal-600 mb-1">Nenhuma reserva ainda</p>
              <p className="text-sm text-charcoal-400 mb-4">Faça sua primeira reserva no café Das Matas.</p>
              <Button variant="primary" onClick={() => setTab('nova')}>
                <Plus size={14} /> Nova reserva
              </Button>
            </Card>
          ) : (
            <>
              {/* Reservas ativas / futuras */}
              {reservasAtivas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Próximas</p>
                  <div className="space-y-3">
                    {reservasAtivas.map(r => <ReservaCard key={r.id} reserva={r} />)}
                  </div>
                </div>
              )}

              {/* Reservas passadas */}
              {reservasPassadas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Histórico</p>
                  <div className="space-y-3">
                    {reservasPassadas.map(r => <ReservaCard key={r.id} reserva={r} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReservaCard({ reserva }: { reserva: Reserva }) {
  const s = STATUS_CONFIG[reserva.status];
  return (
    <Card padding={false}>
      <div className="p-4 flex items-start gap-4">
        {/* Data */}
        <div className="shrink-0 w-12 text-center bg-cream-100 rounded-sm py-2">
          <p className="text-xs text-charcoal-400 leading-none">
            {new Date(reserva.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </p>
          <p className="font-serif text-2xl text-charcoal-700 leading-tight">
            {new Date(reserva.data + 'T12:00:00').getDate()}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-sm border ${s.color}`}>
              {s.icon} {s.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-charcoal-600">
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-charcoal-400" /> {reserva.horario}
            </span>
            <span className="flex items-center gap-1">
              <Users size={13} className="text-charcoal-400" /> {reserva.pessoas} {reserva.pessoas === 1 ? 'pessoa' : 'pessoas'}
            </span>
            <span className="text-charcoal-400 text-xs">
              {Math.floor(reserva.duracaoMins / 60) > 0 && `${Math.floor(reserva.duracaoMins / 60)}h`}
              {reserva.duracaoMins % 60 > 0 && ` ${reserva.duracaoMins % 60}min`}
            </span>
          </div>
          {reserva.observacoes && (
            <p className="text-xs text-charcoal-400 mt-1 truncate">{reserva.observacoes}</p>
          )}
          {reserva.observacoesInternas && (
            <p className="text-xs text-forest-600 mt-1 bg-forest-50 px-2 py-0.5 rounded-sm inline-block">
              {reserva.observacoesInternas}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
