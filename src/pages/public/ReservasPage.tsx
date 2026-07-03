import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, Users, Check, MapPin, Phone, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { Input, Select, Textarea, Button, Alert } from '../../components/ui';
import { createReserva, getDiasFechados, getMesas } from '../../services/reservas.service';
import { getConfiguracoes } from '../../services/configuracoes.service';
import { isEmailValido, isTelefoneValido, formatTelefone } from '../../utils/validation';
import type { Configuracoes, DiaFechado, Mesa } from '../../types';

type Step = 'form' | 'confirmado';

const DIAS_NOMES  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_CURTOS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ── Calendário personalizado ───────────────────────────────────────────────────
interface CalendarioProps {
  value: string;
  onChange: (data: string) => void;
  minDate: string;
  diasFechadosSet: Set<string>;
  diasFechadosSemana: Set<number>; // dias da semana sempre fechados
}

function Calendario({ value, onChange, minDate, diasFechadosSet, diasFechadosSemana }: CalendarioProps) {
  const hoje    = new Date();
  const [mes, setMes]   = useState(value ? new Date(value + 'T12:00:00').getMonth()    : hoje.getMonth());
  const [ano, setAno]   = useState(value ? new Date(value + 'T12:00:00').getFullYear() : hoje.getFullYear());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  function isDisabled(d: Date): boolean {
    const s = d.toISOString().split('T')[0];
    if (s < minDate) return true;
    if (diasFechadosSet.has(s)) return true;
    if (diasFechadosSemana.has(d.getDay())) return true;
    return false;
  }

  function cells(): (Date | null)[] {
    const first = new Date(ano, mes, 1);
    const last  = new Date(ano, mes + 1, 0);
    const arr: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) arr.push(null);
    for (let d = 1; d <= last.getDate(); d++) arr.push(new Date(ano, mes, d));
    return arr;
  }

  function select(d: Date) {
    if (isDisabled(d)) return;
    const s = d.toISOString().split('T')[0];
    // Adjust for timezone: use local date string
    const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    onChange(local);
    setOpen(false);
  }

  const labelData = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Selecione a data';

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">Data *</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-sm text-sm bg-white text-left transition-colors
          ${value ? 'text-charcoal-700 border-cream-300' : 'text-charcoal-400 border-cream-300'}
          focus:outline-none focus:ring-2 focus:ring-forest-400`}
      >
        <span>{labelData}</span>
        <Calendar size={15} className="text-charcoal-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-cream-200 rounded-sm shadow-lg p-4 w-72">
          {/* Navegação */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => { const d = new Date(ano, mes - 1, 1); setMes(d.getMonth()); setAno(d.getFullYear()); }}
              className="p-1 hover:bg-cream-100 rounded-sm transition-colors">
              <ChevronLeft size={16} className="text-charcoal-500" />
            </button>
            <span className="text-sm font-medium text-charcoal-700">{MESES_NOMES[mes]} {ano}</span>
            <button type="button" onClick={() => { const d = new Date(ano, mes + 1, 1); setMes(d.getMonth()); setAno(d.getFullYear()); }}
              className="p-1 hover:bg-cream-100 rounded-sm transition-colors">
              <ChevronRight size={16} className="text-charcoal-500" />
            </button>
          </div>

          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_CURTOS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-charcoal-400 py-1">{d}</div>
            ))}
          </div>

          {/* Dias */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells().map((d, i) => {
              if (!d) return <div key={i} />;
              const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const disabled  = isDisabled(d);
              const selected  = local === value;
              const fechadoEsp = diasFechadosSet.has(local);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(d)}
                  title={fechadoEsp ? (/* motivo será exibido via tooltip */ 'Dia fechado') : diasFechadosSemana.has(d.getDay()) ? 'Sem funcionamento' : undefined}
                  className={`w-full aspect-square flex items-center justify-center text-xs rounded-sm transition-colors
                    ${selected  ? 'bg-forest-500 text-white font-medium' : ''}
                    ${!selected && !disabled ? 'hover:bg-forest-50 text-charcoal-700 cursor-pointer' : ''}
                    ${disabled  ? 'text-charcoal-200 cursor-not-allowed line-through' : ''}
                    ${fechadoEsp && !selected ? 'bg-red-50 text-red-300 line-through' : ''}
                  `}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-3 pt-3 border-t border-cream-100 flex items-center gap-4 text-[10px] text-charcoal-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-50 border border-red-200 rounded-sm inline-block" /> Dia fechado</span>
            <span className="flex items-center gap-1"><span className="line-through text-charcoal-200 font-medium">7</span> Indisponível</span>
          </div>
        </div>
      )}
    </div>
  );
}

function gerarHorarios(abertura: string, fechamento: string): string[] {
  const [aH, aM] = abertura.split(':').map(Number);
  const [fH, fM] = fechamento.split(':').map(Number);
  const slots: string[] = [];
  for (let m = aH * 60 + aM; m < fH * 60 + fM; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}

export function ReservasPage() {
  const [step, setStep]     = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [mesas, setMesas]   = useState<Mesa[]>([]);
  const [diasFechados, setDiasFechados] = useState<DiaFechado[]>([]);
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '',
    data: '', horario: '', pessoas: '2', duracaoMins: '90', observacoes: '',
  });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [erro, setErro]       = useState('');

  useEffect(() => {
    Promise.allSettled([getConfiguracoes(), getDiasFechados(), getMesas()]).then(([cfgR, diasR, mesR]) => {
      if (cfgR.status === 'fulfilled')  setConfig(cfgR.value);
      if (diasR.status === 'fulfilled') setDiasFechados(diasR.value);
      if (mesR.status === 'fulfilled')  setMesas(mesR.value);
    }).finally(() => setConfigLoading(false));
  }, []);

  // ── Horários disponíveis para a data selecionada ────────────────────────
  const horariosDisponiveis: string[] = (() => {
    if (!config || !form.data) return [];
    const dow = new Date(form.data + 'T12:00:00').getDay();
    const hor = config.cafeteria.horarios.find(h => h.diaSemana === dow);
    if (!hor || hor.fechado) return [];
    const slots = gerarHorarios(hor.abertura, hor.fechamento);
    // Remove horários que não respeitam o tempo mínimo de antecedência
    const agora   = Date.now();
    const minutos = config.cafeteria.tempoAntecedenciaMin ?? 60;
    return slots.filter(slot => {
      const dt = new Date(`${form.data}T${slot}:00`).getTime();
      return dt - agora >= minutos * 60 * 1000;
    });
  })();

  // ── Info de horários para exibir na sidebar (sem mock) ───────────────
  const horariosInfo: string[] = (() => {
    if (!config || !config.cafeteria.horarios.length) return [];
    const abertos = config.cafeteria.horarios.filter(h => !h.fechado);
    const fechados = config.cafeteria.horarios.filter(h => h.fechado);
    const lines: string[] = [];
    const grupos = new Map<string, number[]>();
    abertos.forEach(h => {
      const key = `${h.abertura}-${h.fechamento}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(h.diaSemana);
    });
    grupos.forEach((dias, key) => {
      const [ab, fe] = key.split('-');
      const label = dias.map(d => DIAS_NOMES[d].substring(0, 3)).join(', ');
      lines.push(`${label}: ${ab.replace(':00', 'h')} às ${fe.replace(':00', 'h')}`);
    });
    if (fechados.length) {
      lines.push(`Fechado: ${fechados.map(h => DIAS_NOMES[h.diaSemana].substring(0, 3)).join(', ')}`);
    }
    return lines;
  })();

  // ── Data mínima (hoje + antecedência mínima) ───────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const minDate = (() => {
    if (!config) return today;
    const mins = config.cafeteria.tempoAntecedenciaMin ?? 60;
    return new Date(Date.now() + mins * 60 * 1000).toISOString().split('T')[0];
  })();

  const diasFechadosSet     = new Set(diasFechados.map(d => d.data));
  const diasFechadosSemana  = new Set<number>(
    config ? config.cafeteria.horarios.filter(h => h.fechado).map(h => h.diaSemana) : []
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nome) errs.nome = 'Nome é obrigatório';
    if (!form.email) errs.email = 'E-mail é obrigatório';
    else if (!isEmailValido(form.email)) errs.email = 'E-mail inválido.';
    if (!form.telefone) errs.telefone = 'Telefone é obrigatório';
    else if (!isTelefoneValido(form.telefone)) errs.telefone = 'Telefone inválido. Use o formato (11) 99999-9999.';
    if (!form.data) {
      errs.data = 'Data é obrigatória';
    } else if (diasFechadosSet.has(form.data)) {
      errs.data = 'Este dia está fechado.';
    } else if (config) {
      const dow = new Date(form.data + 'T12:00:00').getDay();
      const hor = config.cafeteria.horarios.find(h => h.diaSemana === dow);
      if (!hor || hor.fechado) errs.data = `${DIAS_NOMES[dow]} não há funcionamento.`;
    }
    if (!form.horario) {
      errs.horario = 'Horário é obrigatório';
    } else if (config) {
      const minutos = config.cafeteria.tempoAntecedenciaMin ?? 60;
      const dt = new Date(`${form.data}T${form.horario}:00`).getTime();
      if (dt - Date.now() < minutos * 60 * 1000) {
        errs.horario = `Mínimo de ${minutos} min de antecedência.`;
      }
    }
    if (Number(form.pessoas) > capacidade) {
      errs.pessoas = `Máximo de ${capacidade} pessoas.`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErro('');
    try {
      await createReserva({
        nome:         form.nome,
        email:        form.email,
        telefone:     form.telefone,
        data:         form.data,
        horario:      form.horario,
        pessoas:      Number(form.pessoas),
        duracaoMins:  Number(form.duracaoMins),
        mesasAlocadas: [],
        status:       'solicitada',
        observacoes:  form.observacoes || undefined,
      });
      setStep('confirmado');
    } catch {
      setErro('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const autoAprova = config
    ? config.cafeteria.aprovacaoAutomaticaAte > 0 &&
      Number(form.pessoas) <= config.cafeteria.aprovacaoAutomaticaAte
    : false;

  const capacidade = mesas.length > 0
    ? mesas.filter(m => m.ativa).reduce((s, m) => s + m.capacidade, 0)
    : (config?.cafeteria.capacidadeTotal ?? 20);

  // Data selecionada é dia fechado ou dia sem funcionamento
  const dataBloqueada = (() => {
    if (!form.data) return false;
    if (diasFechadosSet.has(form.data)) return true;
    if (!config) return false;
    const dow = new Date(form.data + 'T12:00:00').getDay();
    const hor = config.cafeteria.horarios.find(h => h.diaSemana === dow);
    return !hor || hor.fechado;
  })();

  return (
    <div className="pt-20">
      <SEO
        title="Reserve sua Mesa — Cafeteria Das Matas em Minas Gerais"
        description="Reserve sua mesa na Cafeteria Das Matas. Café de especialidade, ambiente aconchegante e experiências sensoriais únicas em Minas Gerais. Reserva rápida e gratuita online."
        path="/reservas"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FoodEstablishment',
          'name': 'Das Matas — Reserva de Mesa',
          'url': 'https://www.dasmatas.com.br/reservas',
          'description': 'Reserve sua mesa na Cafeteria Das Matas. Café de especialidade em Minas Gerais.',
          'reservations': 'https://www.dasmatas.com.br/reservas',
          'parentOrganization': { '@id': 'https://www.dasmatas.com.br/#organization' }
        }}
      />
      {/* Header */}
      <section className="py-20 bg-charcoal-700 text-center">
        <p className="font-display italic text-earth-300 text-lg mb-3">Nos visite</p>
        <h1 className="font-serif text-5xl text-cream-100 mb-4">Reserva de Mesa</h1>
        <p className="text-charcoal-300 max-w-lg mx-auto">
          Reserve sua mesa na cafeteria Das Matas. Um ambiente acolhedor para você descobrir o café especial em pessoa.
        </p>
      </section>

      <section className="py-16 bg-cream-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-sm border border-cream-200 p-6">
                <h3 className="font-serif text-lg text-charcoal-700 mb-4">Informações</h3>
                {configLoading ? (
                  <div className="flex items-center gap-2 text-charcoal-400 text-sm">
                    <Loader2 size={14} className="animate-spin" /> Carregando...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(config?.empresa.endereco || config?.empresa.cidade) && (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-earth-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-charcoal-700">Endereço</p>
                          {config.empresa.endereco && <p className="text-sm text-charcoal-500">{config.empresa.endereco}</p>}
                          {(config.empresa.cidade || config.empresa.estado) && (
                            <p className="text-sm text-charcoal-500">
                              {[config.empresa.cidade, config.empresa.estado].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {horariosInfo.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Clock size={18} className="text-earth-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-charcoal-700">Horário</p>
                          {horariosInfo.map((l, i) => (
                            <p key={i} className={`text-sm ${l.startsWith('Fechado') ? 'text-charcoal-400 mt-1' : 'text-charcoal-500'}`}>{l}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {config?.empresa.telefone && (
                      <div className="flex items-start gap-3">
                        <Phone size={18} className="text-earth-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-charcoal-700">Telefone</p>
                          <p className="text-sm text-charcoal-500">{config.empresa.telefone}</p>
                        </div>
                      </div>
                    )}
                    {config && (
                      <div className="flex items-start gap-3">
                        <Users size={18} className="text-earth-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-charcoal-700">Capacidade</p>
                          <p className="text-sm text-charcoal-500">Consulte para acima de {capacidade} pessoas</p>
                          {config.cafeteria.aprovacaoAutomaticaAte > 0 ? (
                            <p className="text-sm text-charcoal-400 mt-1">
                              Grupos até {config.cafeteria.aprovacaoAutomaticaAte} pessoas: confirmação automática
                            </p>
                          ) : (
                            <p className="text-sm text-charcoal-400 mt-1">Sujeito à confirmação</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-forest-500 rounded-sm p-6">
                <h4 className="font-serif text-lg text-cream-100 mb-3">O que esperar</h4>
                <ul className="space-y-2">
                  {[
                    'Ambiente acolhedor e refinado',
                    'Menu de cafés especiais',
                    'Alternativas de preparo variadas',
                    'Equipe especializada',
                    'Experiências sensoriais sob consulta',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-forest-100">
                      <Check size={14} className="text-earth-300 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {step === 'confirmado' ? (
                <div className="bg-white rounded-sm border border-cream-200 p-10 text-center">
                  <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={32} className="text-forest-500" />
                  </div>
                  <h2 className="font-serif text-3xl text-charcoal-700 mb-3">
                    {autoAprova ? 'Reserva confirmada!' : 'Solicitação enviada!'}
                  </h2>
                  <p className="text-charcoal-500 mb-2">
                    Recebemos sua solicitação para <strong>{new Date(form.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong> às <strong>{form.horario}</strong> para <strong>{form.pessoas} {Number(form.pessoas) === 1 ? 'pessoa' : 'pessoas'}</strong>.
                  </p>
                  <p className="text-charcoal-500 mb-8">
                    {autoAprova
                      ? 'Sua reserva foi confirmada automaticamente. Em breve você receberá um e-mail com os detalhes.'
                      : `Em breve você receberá uma confirmação por e-mail em `}
                    {!autoAprova && <strong>{form.email}</strong>}
                    {!autoAprova && '.'}
                  </p>
                  <button
                    onClick={() => { setStep('form'); setForm({ nome: '', email: '', telefone: '', data: '', horario: '', pessoas: '2', duracaoMins: '90', observacoes: '' }); }}
                    className="px-6 py-3 border border-cream-300 text-charcoal-600 text-sm rounded-sm hover:bg-cream-50 transition-colors"
                  >
                    Nova reserva
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-sm border border-cream-200 p-8">
                  <h2 className="font-serif text-2xl text-charcoal-700 mb-6">Dados da reserva</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label="Nome completo *"
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        error={errors.nome}
                        placeholder="Seu nome"
                      />
                      <Input
                        label="E-mail *"
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        error={errors.email}
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label="Telefone / WhatsApp *"
                        value={form.telefone}
                        onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })}
                        error={errors.telefone}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                      />
                      <Select
                        label="Quantidade de pessoas *"
                        value={form.pessoas}
                        onChange={e => setForm({ ...form, pessoas: e.target.value })}
                        error={errors.pessoas}
                        options={Array.from({ length: capacidade }, (_, i) => ({
                          value: String(i + 1),
                          label: `${i + 1} ${i === 0 ? 'pessoa' : 'pessoas'}`,
                        }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <Calendario
                          value={form.data}
                          onChange={data => setForm({ ...form, data, horario: '' })}
                          minDate={minDate}
                          diasFechadosSet={diasFechadosSet}
                          diasFechadosSemana={diasFechadosSemana}
                        />
                        {errors.data && <p className="text-xs text-red-500 mt-1">{errors.data}</p>}
                      </div>
                      <Select
                        label="Horário *"
                        value={form.horario}
                        onChange={e => setForm({ ...form, horario: e.target.value })}
                        placeholder={
                          !form.data
                            ? 'Selecione a data primeiro'
                            : dataBloqueada
                            ? 'Dia sem funcionamento'
                            : horariosDisponiveis.length === 0
                            ? 'Nenhum horário disponível'
                            : 'Selecione o horário'
                        }
                        options={horariosDisponiveis.map(h => ({ value: h, label: h }))}
                        error={errors.horario}
                        disabled={!form.data || dataBloqueada || horariosDisponiveis.length === 0}
                      />
                    </div>

                    <Select
                      label="Duração da visita"
                      value={form.duracaoMins}
                      onChange={e => setForm({ ...form, duracaoMins: e.target.value })}
                      options={[
                        { value: '30',  label: '30 minutos' },
                        { value: '60',  label: '1 hora' },
                        { value: '90',  label: '1h30' },
                        { value: '120', label: '2 horas' },
                        { value: '150', label: '2h30' },
                        { value: '180', label: '3 horas' },
                      ]}
                    />

                    <Textarea
                      label="Observações (opcional)"
                      value={form.observacoes}
                      onChange={e => setForm({ ...form, observacoes: e.target.value })}
                      placeholder="Alguma ocasião especial? Preferências alimentares? Conte para a gente..."
                      rows={3}
                    />

                    {erro && <Alert type="error" message={erro} />}

                    <Alert
                      type="info"
                      message={
                        autoAprova
                          ? 'Para grupos de até ' + config!.cafeteria.aprovacaoAutomaticaAte + ' pessoas, a reserva é confirmada automaticamente.'
                          : 'As reservas ficam sujeitas à confirmação. Você receberá um retorno em até 2 horas após a solicitação.'
                      }
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      disabled={configLoading || dataBloqueada}
                      className="w-full"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                      Solicitar Reserva
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
