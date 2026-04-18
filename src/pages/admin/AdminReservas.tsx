import { useEffect, useRef, useState } from 'react';
import {
  Calendar, Check, X, Clock, Users, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, Copy, Loader2, AlertTriangle, Table2, LayoutGrid, List,
  UserCheck, UserX,
} from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select, Textarea,
  SectionHeader, Tabs, StatCard,
} from '../../components/ui';
import {
  getReservas, getMesas, createMesa, updateMesa, deleteMesa,
  getDiasFechados, createDiaFechado, updateDiaFechado, deleteDiaFechado,
  updateReservaStatus, updateReservaMesas, createReserva,
  mesasDisponiveis, sugerirAlocacao,
} from '../../services/reservas.service';
import { getConfiguracoes, saveConfiguracoes } from '../../services/configuracoes.service';
import type { Reserva, Mesa, DiaFechado, Configuracoes, HorarioFuncionamento } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  solicitada: 'Solicitada', confirmada: 'Confirmada', recusada: 'Recusada',
  cancelada: 'Cancelada', concluida: 'Concluída', no_show: 'No-show',
};
const STATUS_COLOR: Record<string, string> = {
  solicitada: 'bg-gold-100 text-gold-700 border-gold-200',
  confirmada: 'bg-forest-100 text-forest-700 border-forest-200',
  recusada: 'bg-red-100 text-red-600 border-red-200',
  cancelada: 'bg-charcoal-100 text-charcoal-500 border-charcoal-200',
  concluida: 'bg-blue-100 text-blue-700 border-blue-200',
  no_show: 'bg-red-100 text-red-500 border-red-200',
};

const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HORARIOS_PADRAO = [0,1,2,3,4,5,6].map(d => ({ diaSemana: d, abertura: '08:00', fechamento: '18:00', fechado: d === 0 }));

function dataStr(d: Date): string {
  return d.toISOString().split('T')[0];
}
function parseDate(s: string): Date {
  return new Date(s + 'T12:00:00');
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminReservas() {
  const [reservas, setReservas]     = useState<Reserva[]>([]);
  const [mesas, setMesas]           = useState<Mesa[]>([]);
  const [diasFechados, setDiasFechados] = useState<DiaFechado[]>([]);
  const [config, setConfig]         = useState<Configuracoes | null>(null);
  const [tab, setTab]               = useState('reservas');
  const [loading, setLoading]       = useState(true);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [selected, setSelected]         = useState<Reserva | null>(null);
  const [obsInterna, setObsInterna]     = useState('');
  const [mesasSel, setMesasSel]         = useState<string[]>([]);
  const [salvandoRes, setSalvandoRes]   = useState(false);

  // ── Seleção em lote ──────────────────────────────────────────────────────
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [processandoLote, setProcessandoLote] = useState(false);

  function toggleSel(id: string) {
    setSelecionadas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleTodas() {
    setSelecionadas(prev => prev.size === reservas.length ? new Set() : new Set(reservas.map(r => r.id)));
  }
  async function handleAutoAlocarLote() {
    setProcessandoLote(true);
    try {
      for (const id of selecionadas) {
        const r = reservas.find(x => x.id === id);
        if (!r || r.mesasAlocadas.length) continue;
        const alocadas = autoAlocar(r);
        if (!alocadas.length) continue;
        await updateReservaMesas(id, alocadas);
        setReservas(prev => prev.map(x => x.id === id ? { ...x, mesasAlocadas: alocadas } : x));
      }
      setSelecionadas(new Set());
    } catch { alert('Erro ao alocar mesas.'); }
    finally { setProcessandoLote(false); }
  }
  async function handleConfirmarLote() {
    setProcessandoLote(true);
    try {
      for (const id of selecionadas) {
        await updateReservaStatus(id, 'confirmada');
        setReservas(prev => prev.map(x => x.id === id ? { ...x, status: 'confirmada' } : x));
      }
      setSelecionadas(new Set());
    } catch { alert('Erro ao confirmar reservas.'); }
    finally { setProcessandoLote(false); }
  }
  async function handleRecusarLote() {
    if (!confirm(`Recusar ${selecionadas.size} reserva(s)?`)) return;
    setProcessandoLote(true);
    try {
      for (const id of selecionadas) {
        await updateReservaStatus(id, 'recusada');
        setReservas(prev => prev.map(x => x.id === id ? { ...x, status: 'recusada' } : x));
      }
      setSelecionadas(new Set());
    } catch { alert('Erro ao recusar reservas.'); }
    finally { setProcessandoLote(false); }
  }

  // ── Nova reserva ──────────────────────────────────────────────────────────
  const [novaModal, setNovaModal] = useState(false);
  const [formNova, setFormNova] = useState({
    nome: '', email: '', telefone: '', data: '', horario: '', pessoas: '2',
    duracaoMins: '90', observacoes: '',
  });
  const [salvandoNova, setSalvandoNova] = useState(false);

  // ── Mesas ─────────────────────────────────────────────────────────────────
  const [mesaModal, setMesaModal]   = useState(false);
  const [editMesa, setEditMesa]     = useState<Mesa | null>(null);
  const [formMesa, setFormMesa]     = useState({ numero: '', nome: '', capacidade: '4', descricao: '' });
  const [salvandoMesa, setSalvandoMesa] = useState(false);
  const [deletandoMesa, setDeletandoMesa] = useState<string | null>(null);
  const [duplicandoMesa, setDuplicandoMesa] = useState<string | null>(null);

  // ── Dias fechados ─────────────────────────────────────────────────────────
  const [diaFechadoModal, setDiaFechadoModal] = useState(false);
  const [editDia, setEditDia]   = useState<DiaFechado | null>(null);
  const [formDia, setFormDia]   = useState({ data: '', motivo: '' });
  const [salvandoDia, setSalvandoDia] = useState(false);
  const [deletandoDia, setDeletandoDia] = useState<string | null>(null);

  // ── Config ────────────────────────────────────────────────────────────────
  const [formConfig, setFormConfig] = useState<{
    aprovacaoAutomaticaAte: string;
    tempoAntecedenciaMin: string;
    horarios: HorarioFuncionamento[];
  }>({ aprovacaoAutomaticaAte: '0', tempoAntecedenciaMin: '60', horarios: HORARIOS_PADRAO });
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // ── Calendário ───────────────────────────────────────────────────────────
  const today = new Date();
  const [calMes, setCalMes]   = useState(today.getMonth());
  const [calAno, setCalAno]   = useState(today.getFullYear());
  const [calDia, setCalDia]   = useState<string | null>(null);
  const [calView, setCalView] = useState<'lista' | 'mesas'>('lista');

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      getReservas(),
      getMesas(),
      getDiasFechados(),
      getConfiguracoes(),
    ]).then(([resR, mesR, diasR, cfgR]) => {
      if (resR.status === 'fulfilled')  setReservas(resR.value);
      else console.error('getReservas:', resR.reason);

      if (mesR.status === 'fulfilled')  setMesas(mesR.value);
      else console.error('getMesas:', mesR.reason);

      if (diasR.status === 'fulfilled') setDiasFechados(diasR.value);
      else console.error('getDiasFechados:', diasR.reason);

      const cfg = cfgR.status === 'fulfilled' ? cfgR.value : null;
      if (cfg) {
        setConfig(cfg);
        setFormConfig({
          aprovacaoAutomaticaAte: String(cfg.cafeteria.aprovacaoAutomaticaAte ?? 0),
          tempoAntecedenciaMin:   String(cfg.cafeteria.tempoAntecedenciaMin ?? 60),
          horarios: cfg.cafeteria.horarios.length ? cfg.cafeteria.horarios : HORARIOS_PADRAO,
        });
      } else {
        console.error('getConfiguracoes:', (cfgR as PromiseRejectedResult).reason);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Abrir detalhe da reserva ──────────────────────────────────────────────
  function abrirReserva(r: Reserva) {
    setSelected(r);
    setObsInterna(r.observacoesInternas ?? '');
    setMesasSel(r.mesasAlocadas?.length ? r.mesasAlocadas : r.mesaId ? [r.mesaId] : []);
  }

  // ── Auto-alocação ─────────────────────────────────────────────────────────
  function autoAlocar(r: Reserva): string[] {
    const disp = mesasDisponiveis(mesas, reservas, r.data, r.horario, r.duracaoMins, r.id);
    return sugerirAlocacao(disp, r.pessoas);
  }

  // ── Confirmar reserva ─────────────────────────────────────────────────────
  async function handleConfirmar(r: Reserva) {
    setSalvandoRes(true);
    try {
      const alocadas = mesasSel.length ? mesasSel : autoAlocar(r);
      await updateReservaStatus(r.id, 'confirmada', obsInterna, alocadas);
      setReservas(prev => prev.map(x =>
        x.id === r.id ? { ...x, status: 'confirmada', mesasAlocadas: alocadas, observacoesInternas: obsInterna } : x
      ));
      setSelected(null);
    } catch { alert('Erro ao confirmar reserva.'); }
    finally { setSalvandoRes(false); }
  }

  async function handleRecusar(r: Reserva) {
    setSalvandoRes(true);
    try {
      await updateReservaStatus(r.id, 'recusada', obsInterna);
      setReservas(prev => prev.map(x => x.id === r.id ? { ...x, status: 'recusada' } : x));
      setSelected(null);
    } catch { alert('Erro ao recusar reserva.'); }
    finally { setSalvandoRes(false); }
  }

  async function handlePresenca(r: Reserva, presente: boolean) {
    setSalvandoRes(true);
    try {
      const novoStatus: Reserva['status'] = presente ? 'concluida' : 'no_show';
      await updateReservaStatus(r.id, novoStatus, obsInterna);
      setReservas(prev => prev.map(x => x.id === r.id ? { ...x, status: novoStatus } : x));
      setSelected(null);
    } catch { alert('Erro ao registrar presença.'); }
    finally { setSalvandoRes(false); }
  }

  async function handleSalvarMesas() {
    if (!selected) return;
    setSalvandoRes(true);
    try {
      await updateReservaMesas(selected.id, mesasSel);
      setReservas(prev => prev.map(x => x.id === selected.id ? { ...x, mesasAlocadas: mesasSel } : x));
      setSelected(prev => prev ? { ...prev, mesasAlocadas: mesasSel } : prev);
    } catch { alert('Erro ao salvar mesas.'); }
    finally { setSalvandoRes(false); }
  }

  // ── Nova reserva ──────────────────────────────────────────────────────────
  async function handleCriarReserva() {
    setSalvandoNova(true);
    try {
      await createReserva({
        nome: formNova.nome, email: formNova.email, telefone: formNova.telefone,
        data: formNova.data, horario: formNova.horario,
        pessoas: parseInt(formNova.pessoas) || 2,
        duracaoMins: parseInt(formNova.duracaoMins) || 90,
        mesasAlocadas: [], status: 'solicitada', observacoes: formNova.observacoes,
      });
      // Recarrega lista para obter o ID real da reserva recém-criada
      const atualizadas = await getReservas();
      setReservas(atualizadas);
      setNovaModal(false);
      setFormNova({ nome: '', email: '', telefone: '', data: '', horario: '', pessoas: '2', duracaoMins: '90', observacoes: '' });
    } catch { alert('Erro ao criar reserva.'); }
    finally { setSalvandoNova(false); }
  }

  // ── Mesas CRUD ────────────────────────────────────────────────────────────
  function abrirNovaMesa() {
    setEditMesa(null);
    setFormMesa({ numero: '', nome: '', capacidade: '4', descricao: '' });
    setMesaModal(true);
  }
  function abrirEditarMesa(m: Mesa) {
    setEditMesa(m);
    setFormMesa({ numero: m.numero, nome: m.nome ?? '', capacidade: String(m.capacidade), descricao: m.descricao ?? '' });
    setMesaModal(true);
  }
  async function handleSalvarMesa() {
    setSalvandoMesa(true);
    try {
      const patch = { numero: formMesa.numero, nome: formMesa.nome || undefined, capacidade: parseInt(formMesa.capacidade) || 4, descricao: formMesa.descricao || undefined };
      if (editMesa) {
        await updateMesa(editMesa.id, patch);
        setMesas(prev => prev.map(m => m.id === editMesa.id ? { ...m, ...patch } : m));
      } else {
        const nova = await createMesa(patch);
        setMesas(prev => [...prev, nova]);
      }
      setMesaModal(false);
    } catch { alert('Erro ao salvar mesa.'); }
    finally { setSalvandoMesa(false); }
  }
  async function handleDeletarMesa(id: string) {
    if (!confirm('Excluir esta mesa?')) return;
    setDeletandoMesa(id);
    try {
      await deleteMesa(id);
      setMesas(prev => prev.filter(m => m.id !== id));
    } catch { alert('Erro ao excluir mesa.'); }
    finally { setDeletandoMesa(null); }
  }
  async function handleDuplicarMesa(mesa: Mesa) {
    setDuplicandoMesa(mesa.id);
    try {
      const nova = await createMesa({
        numero: mesa.numero + 'a',
        nome: mesa.nome ? mesa.nome + ' (cópia)' : undefined,
        capacidade: mesa.capacidade,
        descricao: mesa.descricao,
      });
      setMesas(prev => [...prev, nova]);
    } catch { alert('Erro ao duplicar mesa.'); }
    finally { setDuplicandoMesa(null); }
  }

  // ── Dias fechados ─────────────────────────────────────────────────────────
  function abrirNovoDia() {
    setEditDia(null);
    setFormDia({ data: '', motivo: '' });
    setDiaFechadoModal(true);
  }
  function abrirEditarDia(d: DiaFechado) {
    setEditDia(d);
    setFormDia({ data: d.data, motivo: d.motivo ?? '' });
    setDiaFechadoModal(true);
  }
  async function handleSalvarDia() {
    if (!formDia.data) return;
    setSalvandoDia(true);
    try {
      if (editDia) {
        await updateDiaFechado(editDia.id, formDia.data, formDia.motivo || undefined);
        setDiasFechados(prev =>
          prev.map(d => d.id === editDia.id ? { ...d, data: formDia.data, motivo: formDia.motivo || undefined } : d)
            .sort((a, b) => a.data.localeCompare(b.data))
        );
      } else {
        const novo = await createDiaFechado(formDia.data, formDia.motivo || undefined);
        setDiasFechados(prev => [...prev, novo].sort((a, b) => a.data.localeCompare(b.data)));
      }
      setDiaFechadoModal(false);
      setFormDia({ data: '', motivo: '' });
      setEditDia(null);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        alert('Já existe um dia fechado cadastrado para esta data.');
      } else {
        alert('Erro ao salvar dia fechado.');
      }
    }
    finally { setSalvandoDia(false); }
  }
  async function handleDeletarDia(id: string) {
    if (!confirm('Excluir este dia fechado?')) return;
    setDeletandoDia(id);
    try {
      await deleteDiaFechado(id);
      setDiasFechados(prev => prev.filter(d => d.id !== id));
    } catch { alert('Erro ao excluir.'); }
    finally { setDeletandoDia(null); }
  }

  // ── Salvar config ─────────────────────────────────────────────────────────
  async function handleSalvarConfig() {
    setSalvandoConfig(true);
    try {
      await saveConfiguracoes({
        cafeteria: {
          horarios: formConfig.horarios,
          capacidadeTotal: config?.cafeteria.capacidadeTotal ?? 24,
          aprovacaoAutomaticaAte: parseInt(formConfig.aprovacaoAutomaticaAte) || 0,
          tempoAntecedenciaMin: parseInt(formConfig.tempoAntecedenciaMin) || 60,
        },
      });
      alert('Configurações salvas!');
    } catch { alert('Erro ao salvar configurações.'); }
    finally { setSalvandoConfig(false); }
  }

  // ── Calendário helpers ────────────────────────────────────────────────────
  const calDias: (Date | null)[] = (() => {
    const first = new Date(calAno, calMes, 1);
    const last  = new Date(calAno, calMes + 1, 0);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(calAno, calMes, d));
    return cells;
  })();

  const reservasPorDia = (d: Date) =>
    reservas.filter(r => r.data === dataStr(d) && r.status !== 'cancelada' && r.status !== 'recusada');

  const diaFechadoSet = new Set(diasFechados.map(d => d.data));

  // Dia selecionado no calendário
  const calReservas = calDia ? reservas.filter(r => r.data === calDia && r.status !== 'cancelada' && r.status !== 'recusada') : [];

  // ── Slots de tempo para visão de mesas (a cada 30min)
  const calSlots: string[] = (() => {
    if (!config || !calDia) return [];
    const dia = parseDate(calDia);
    const dow  = dia.getDay();
    const hor  = formConfig.horarios.find(h => h.diaSemana === dow);
    if (!hor || hor.fechado) return [];
    const [aH, aM] = hor.abertura.split(':').map(Number);
    const [fH, fM] = hor.fechamento.split(':').map(Number);
    const slots: string[] = [];
    for (let m = aH * 60 + aM; m < fH * 60 + fM; m += 30) {
      slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return slots;
  })();

  function slotOcupado(mesaId: string, slot: string): Reserva | null {
    if (!calDia) return null;
    const [sH, sM] = slot.split(':').map(Number);
    const slotMin  = sH * 60 + sM;
    return calReservas.find(r => {
      if (!r.mesasAlocadas.includes(mesaId)) return false;
      const [rH, rM] = r.horario.split(':').map(Number);
      const rIni = rH * 60 + rM;
      const rFim = rIni + (r.duracaoMins ?? 90);
      return slotMin >= rIni && slotMin < rFim;
    }) ?? null;
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const confirmadas = reservas.filter(r => r.status === 'confirmada').length;
  const pendentes   = reservas.filter(r => r.status === 'solicitada').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-forest-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Reservas"
        subtitle="Gestão da cafeteria e mesas"
        action={
          <Button variant="primary" size="sm" onClick={() => setNovaModal(true)}>
            <Plus size={14} /> Nova reserva
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Confirmadas"    value={confirmadas} color="forest" icon={<Check size={18} />} />
        <StatCard title="Pendentes"      value={pendentes}   color="gold"   icon={<Clock size={18} />} />
        <StatCard title="Mesas Ativas"   value={mesas.filter(m => m.ativa).length} color="earth" icon={<Table2 size={18} />} />
        <StatCard title="Capacidade"     value={mesas.reduce((s, m) => s + (m.ativa ? m.capacidade : 0), 0)} subtitle="lugares" color="forest" icon={<Users size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: 'reservas',      label: 'Reservas',     count: reservas.length },
          { id: 'calendario',    label: 'Calendário' },
          { id: 'mesas',         label: 'Mesas',        count: mesas.length },
          { id: 'configuracoes', label: 'Configurações' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── LISTA DE RESERVAS ─────────────────────────────────────────────── */}
      {tab === 'reservas' && (
        <div className="space-y-2">
          {/* Barra de ações em lote */}
          {selecionadas.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-forest-50 border border-forest-200 rounded-sm">
              <span className="text-sm font-medium text-forest-700">{selecionadas.size} selecionada{selecionadas.size > 1 ? 's' : ''}</span>
              <div className="flex gap-2 ml-2">
                <Button variant="primary" size="sm" onClick={handleAutoAlocarLote} disabled={processandoLote}>
                  {processandoLote ? <Loader2 size={13} className="animate-spin" /> : <Table2 size={13} />}
                  Auto alocar mesas
                </Button>
                <Button variant="secondary" size="sm" onClick={handleConfirmarLote} disabled={processandoLote}>
                  <Check size={13} /> Confirmar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRecusarLote} disabled={processandoLote} className="text-red-600 hover:bg-red-50">
                  <X size={13} /> Recusar
                </Button>
              </div>
              <button onClick={() => setSelecionadas(new Set())} className="ml-auto text-xs text-charcoal-400 hover:text-charcoal-600">
                Limpar seleção
              </button>
            </div>
          )}

          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th w-10">
                      <input
                        type="checkbox"
                        checked={selecionadas.size === reservas.length && reservas.length > 0}
                        onChange={toggleTodas}
                        className="accent-forest-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="table-th">Cliente</th>
                    <th className="table-th">Data / Horário</th>
                    <th className="table-th">Pessoas</th>
                    <th className="table-th">Mesas</th>
                    <th className="table-th">Observações</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.length === 0 ? (
                    <tr><td colSpan={8} className="table-td text-center text-charcoal-400 py-10">Nenhuma reserva.</td></tr>
                  ) : reservas.map(r => {
                    const mesasNomes = r.mesasAlocadas.map(id => mesas.find(m => m.id === id)).filter(Boolean).map(m => m!.nome ?? `Mesa ${m!.numero}`);
                    const sel = selecionadas.has(r.id);
                    return (
                      <tr key={r.id} className={`border-t border-cream-100 hover:bg-cream-50 cursor-pointer ${sel ? 'bg-forest-50' : ''}`}
                        onClick={() => abrirReserva(r)}>
                        <td className="table-td" onClick={e => { e.stopPropagation(); toggleSel(r.id); }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleSel(r.id)}
                            onClick={e => e.stopPropagation()}
                            className="accent-forest-500 w-4 h-4 cursor-pointer" />
                        </td>
                        <td className="table-td">
                          <p className="font-medium text-charcoal-700">{r.nome}</p>
                          <p className="text-xs text-charcoal-400">{r.telefone}</p>
                        </td>
                        <td className="table-td">
                          <p className="text-sm text-charcoal-700">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-charcoal-400">{r.horario} · {r.duracaoMins}min</p>
                        </td>
                        <td className="table-td text-charcoal-600">{r.pessoas}</td>
                        <td className="table-td text-charcoal-500 text-sm">
                          {mesasNomes.length ? mesasNomes.join(', ') : '—'}
                        </td>
                        <td className="table-td text-charcoal-500 text-sm max-w-xs truncate">{r.observacoes || '—'}</td>
                        <td className="table-td">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[r.status]}`}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            {r.status === 'solicitada' && (
                              <>
                                <button onClick={e => { e.stopPropagation(); abrirReserva(r); }} className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm" title="Confirmar"><Check size={14} /></button>
                                <button onClick={e => { e.stopPropagation(); abrirReserva(r); }} className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm" title="Recusar"><X size={14} /></button>
                              </>
                            )}
                            {r.status === 'confirmada' && (
                              <>
                                <button
                                  onClick={async e => { e.stopPropagation(); await updateReservaStatus(r.id, 'concluida'); setReservas(prev => prev.map(x => x.id === r.id ? { ...x, status: 'concluida' } : x)); }}
                                  className="p-1.5 text-charcoal-400 hover:text-forest-600 hover:bg-forest-50 rounded-sm"
                                  title="Marcar como presente"
                                >
                                  <UserCheck size={14} />
                                </button>
                                <button
                                  onClick={async e => { e.stopPropagation(); await updateReservaStatus(r.id, 'no_show'); setReservas(prev => prev.map(x => x.id === r.id ? { ...x, status: 'no_show' } : x)); }}
                                  className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm"
                                  title="Marcar como no-show"
                                >
                                  <UserX size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── CALENDÁRIO ───────────────────────────────────────────────────── */}
      {tab === 'calendario' && (
        <div className="space-y-4">
          {/* Navegação do mês */}
          <div className="flex items-center justify-between">
            <button onClick={() => { const d = new Date(calAno, calMes - 1); setCalMes(d.getMonth()); setCalAno(d.getFullYear()); setCalDia(null); }} className="p-2 rounded-sm hover:bg-cream-100 text-charcoal-500">
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-serif text-lg text-charcoal-700 capitalize">
              {new Date(calAno, calMes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => { const d = new Date(calAno, calMes + 1); setCalMes(d.getMonth()); setCalAno(d.getFullYear()); setCalDia(null); }} className="p-2 rounded-sm hover:bg-cream-100 text-charcoal-500">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Grid do calendário */}
          <Card padding={false}>
            <div className="grid grid-cols-7">
              {DIAS_NOMES.map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-charcoal-400 border-b border-cream-100">{d}</div>
              ))}
              {calDias.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="min-h-20 border-b border-r border-cream-100 bg-cream-50/50" />;
                const ds = dataStr(d);
                const res = reservasPorDia(d);
                const fechado = diaFechadoSet.has(ds);
                const isToday = ds === dataStr(today);
                const isSel   = ds === calDia;
                return (
                  <div
                    key={ds}
                    onClick={() => setCalDia(isSel ? null : ds)}
                    className={`min-h-20 p-2 border-b border-r border-cream-100 cursor-pointer transition-colors ${
                      isSel ? 'bg-forest-50 ring-2 ring-inset ring-forest-300' :
                      fechado ? 'bg-red-50' :
                      'hover:bg-cream-50'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-1 ${isToday ? 'bg-forest-500 text-white font-bold' : 'text-charcoal-600'}`}>{d.getDate()}</span>
                    {fechado && <p className="text-[9px] text-red-500 font-medium">Fechado</p>}
                    {res.length > 0 && (
                      <div className="space-y-0.5">
                        <span className="inline-block text-[10px] bg-forest-100 text-forest-700 px-1.5 py-0.5 rounded-full">{res.length} reserva{res.length > 1 ? 's' : ''}</span>
                        {res.filter(r => r.status === 'solicitada').length > 0 && (
                          <span className="inline-block ml-1 text-[10px] bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded-full">{res.filter(r => r.status === 'solicitada').length} pend.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Detalhe do dia selecionado */}
          {calDia && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-charcoal-700">
                  {parseDate(calDia).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => setCalView('lista')} className={`p-1.5 rounded-sm ${calView === 'lista' ? 'bg-forest-100 text-forest-600' : 'text-charcoal-400 hover:bg-cream-100'}`}><List size={16} /></button>
                  <button onClick={() => setCalView('mesas')} className={`p-1.5 rounded-sm ${calView === 'mesas' ? 'bg-forest-100 text-forest-600' : 'text-charcoal-400 hover:bg-cream-100'}`}><LayoutGrid size={16} /></button>
                </div>
              </div>

              {diaFechadoSet.has(calDia) && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm mb-4 text-sm text-red-700">
                  <AlertTriangle size={14} />
                  Cafeteria fechada — {diasFechados.find(d => d.data === calDia)?.motivo ?? 'dia fechado'}
                </div>
              )}

              {calView === 'lista' && (
                calReservas.length === 0 ? (
                  <p className="text-sm text-charcoal-400 py-4 text-center">Nenhuma reserva neste dia.</p>
                ) : (
                  <div className="space-y-3">
                    {calReservas.sort((a, b) => a.horario.localeCompare(b.horario)).map(r => {
                      const mesasNomes = r.mesasAlocadas.map(id => mesas.find(m => m.id === id)).filter(Boolean).map(m => m!.nome ?? `Mesa ${m!.numero}`);
                      return (
                        <div key={r.id} onClick={() => abrirReserva(r)} className="flex items-start gap-3 p-3 bg-cream-50 rounded-sm border border-cream-200 hover:border-forest-200 cursor-pointer transition-colors">
                          <div className="text-center w-14 shrink-0">
                            <p className="text-sm font-bold text-charcoal-700">{r.horario}</p>
                            <p className="text-[10px] text-charcoal-400">{r.duracaoMins}min</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-charcoal-700">{r.nome}</p>
                            <p className="text-xs text-charcoal-400">{r.pessoas} pessoas · {mesasNomes.join(', ') || 'sem mesa'}</p>
                            {r.observacoes && <p className="text-xs text-charcoal-500 mt-0.5 truncate">{r.observacoes}</p>}
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full border font-medium shrink-0 ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {calView === 'mesas' && (
                calSlots.length === 0 ? (
                  <p className="text-sm text-charcoal-400 py-4 text-center">Fora do horário de funcionamento.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-charcoal-400 font-medium border-b border-cream-200 w-20">Horário</th>
                          {mesas.filter(m => m.ativa).map(m => (
                            <th key={m.id} className="p-2 text-center text-charcoal-600 font-medium border-b border-cream-200">
                              {m.nome ?? `Mesa ${m.numero}`}
                              <span className="block text-[9px] text-charcoal-400">{m.capacidade} lug.</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calSlots.map(slot => (
                          <tr key={slot} className="border-b border-cream-100">
                            <td className="p-2 text-charcoal-500 font-mono">{slot}</td>
                            {mesas.filter(m => m.ativa).map(m => {
                              const res = slotOcupado(m.id, slot);
                              return (
                                <td key={m.id} className={`p-1 text-center ${res ? '' : ''}`}>
                                  {res ? (
                                    <button
                                      onClick={() => abrirReserva(res)}
                                      className={`w-full px-1 py-0.5 rounded text-[9px] font-medium border leading-tight ${STATUS_COLOR[res.status]}`}
                                    >
                                      {res.nome.split(' ')[0]}
                                    </button>
                                  ) : (
                                    <span className="block w-full h-5 rounded bg-forest-50 border border-forest-100" title="Livre" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── MESAS ─────────────────────────────────────────────────────────── */}
      {tab === 'mesas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={abrirNovaMesa}><Plus size={14} /> Nova mesa</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mesas.map(mesa => (
              <Card key={mesa.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-charcoal-700">{mesa.nome ?? `Mesa ${mesa.numero}`}</h3>
                    <p className="text-xs text-charcoal-400">Nº {mesa.numero}</p>
                    {mesa.descricao && <p className="text-xs text-charcoal-400 mt-0.5">{mesa.descricao}</p>}
                  </div>
                  <Badge variant={mesa.ativa ? 'active' : 'inactive'}>{mesa.ativa ? 'Ativa' : 'Inativa'}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={14} className="text-charcoal-400" />
                  <span className="text-sm text-charcoal-600">{mesa.capacidade} pessoas</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => abrirEditarMesa(mesa)}>
                    <Pencil size={13} /> Editar
                  </Button>
                  <button onClick={() => handleDuplicarMesa(mesa)} disabled={duplicandoMesa === mesa.id} title="Duplicar mesa" className="p-1.5 text-charcoal-400 hover:text-forest-600 hover:bg-forest-50 rounded-sm transition-colors">
                    {duplicandoMesa === mesa.id ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => updateMesa(mesa.id, { ativa: !mesa.ativa }).then(() => setMesas(prev => prev.map(m => m.id === mesa.id ? { ...m, ativa: !m.ativa } : m)))}>
                    {mesa.ativa ? 'Desativar' : 'Ativar'}
                  </Button>
                  <button onClick={() => handleDeletarMesa(mesa.id)} disabled={deletandoMesa === mesa.id} className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors">
                    {deletandoMesa === mesa.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </Card>
            ))}
            <div onClick={abrirNovaMesa} className="min-h-40 rounded-sm border-2 border-dashed border-cream-300 hover:border-forest-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-charcoal-400 hover:text-forest-600">
              <Plus size={22} />
              <p className="text-sm">Nova mesa</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIGURAÇÕES ────────────────────────────────────────────────── */}
      {tab === 'configuracoes' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-xl text-charcoal-700 mb-5">Configurações da cafeteria</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                  Aprovação automática até (nº de pessoas)
                </label>
                <input
                  type="number" min="0" value={formConfig.aprovacaoAutomaticaAte}
                  onChange={e => setFormConfig(p => ({ ...p, aprovacaoAutomaticaAte: e.target.value }))}
                  placeholder="0 = nunca automático"
                  className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
                <p className="text-[11px] text-charcoal-400 mt-1">0 = aprovação sempre manual. Ex.: 4 = aprova automaticamente grupos de até 4 pessoas.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                  Tempo mínimo de antecedência (minutos)
                </label>
                <input
                  type="number" min="0" value={formConfig.tempoAntecedenciaMin}
                  onChange={e => setFormConfig(p => ({ ...p, tempoAntecedenciaMin: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
                <p className="text-[11px] text-charcoal-400 mt-1">Ex.: 120 = só aceita reservas com pelo menos 2h de antecedência.</p>
              </div>
            </div>

            {/* Horários */}
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Horário de funcionamento</p>
            <div className="border border-cream-200 rounded-sm overflow-hidden mb-6">
              {formConfig.horarios.map((h, i) => (
                <div key={h.diaSemana} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-cream-50'} border-b border-cream-100 last:border-b-0`}>
                  <span className="text-sm font-medium text-charcoal-700 w-20 shrink-0">{DIAS_FULL[h.diaSemana]}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={!h.fechado}
                      onChange={e => setFormConfig(p => ({ ...p, horarios: p.horarios.map((x, j) => j === i ? { ...x, fechado: !e.target.checked } : x) }))}
                      className="accent-forest-500 w-4 h-4"
                    />
                    <span className="text-xs text-charcoal-500">{h.fechado ? 'Fechado' : 'Aberto'}</span>
                  </label>
                  <div className={`flex items-center gap-2 ${h.fechado ? 'opacity-30 pointer-events-none' : ''}`}>
                    <input
                      type="time" value={h.abertura} disabled={h.fechado}
                      onChange={e => setFormConfig(p => ({ ...p, horarios: p.horarios.map((x, j) => j === i ? { ...x, abertura: e.target.value } : x) }))}
                      className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                    <span className="text-charcoal-400 text-sm">até</span>
                    <input
                      type="time" value={h.fechamento} disabled={h.fechado}
                      onChange={e => setFormConfig(p => ({ ...p, horarios: p.horarios.map((x, j) => j === i ? { ...x, fechamento: e.target.value } : x) }))}
                      className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button variant="primary" onClick={handleSalvarConfig} disabled={salvandoConfig}>
              {salvandoConfig ? <Loader2 size={14} className="animate-spin" /> : null}
              Salvar configurações
            </Button>
          </Card>

          {/* Dias fechados */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-charcoal-700">Dias Fechados</h3>
              <Button variant="secondary" size="sm" onClick={abrirNovoDia}>
                <Plus size={14} /> Adicionar dia
              </Button>
            </div>
            {diasFechados.length === 0 ? (
              <p className="text-sm text-charcoal-400 py-3">Nenhum dia fechado cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {diasFechados.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-sm border border-cream-200">
                    <div>
                      <p className="text-sm font-medium text-charcoal-700">{parseDate(d.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      {d.motivo && <p className="text-xs text-charcoal-400">{d.motivo}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirEditarDia(d)} title="Editar" className="p-1.5 text-charcoal-400 hover:text-forest-600 hover:bg-forest-50 rounded-sm transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeletarDia(d.id)} disabled={deletandoDia === d.id} title="Excluir" className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors">
                        {deletandoDia === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MODAL: Detalhe da reserva ─────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalhes da Reserva" size="lg">
        {selected && (() => {
          const disponiveis = mesasDisponiveis(mesas, reservas, selected.data, selected.horario, selected.duracaoMins, selected.id);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Nome',     value: selected.nome },
                  { label: 'E-mail',   value: selected.email },
                  { label: 'Telefone', value: selected.telefone || '—' },
                  { label: 'Data',     value: parseDate(selected.data).toLocaleDateString('pt-BR') },
                  { label: 'Horário',  value: selected.horario },
                  { label: 'Pessoas',  value: String(selected.pessoas) },
                  { label: 'Duração',  value: `${selected.duracaoMins} min` },
                ].map(info => (
                  <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                    <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                    <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                  </div>
                ))}
              </div>

              {selected.observacoes && (
                <div>
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Observações do cliente</p>
                  <p className="text-sm text-charcoal-600 bg-cream-50 p-3 rounded-sm">{selected.observacoes}</p>
                </div>
              )}

              {/* Mesas alocadas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Mesas alocadas</p>
                  <button
                    onClick={() => setMesasSel(autoAlocar(selected))}
                    className="text-[11px] text-forest-600 hover:text-forest-700 font-medium flex items-center gap-1"
                  >
                    <LayoutGrid size={11} /> Auto-alocar
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mesas.filter(m => m.ativa).map(m => {
                    const selecionada = mesasSel.includes(m.id);
                    const disponivel  = disponiveis.some(d => d.id === m.id) || selecionada;
                    return (
                      <button
                        key={m.id}
                        disabled={!disponivel}
                        onClick={() => setMesasSel(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                        className={`p-2.5 rounded-sm border text-xs transition-all text-left ${
                          selecionada  ? 'bg-forest-100 border-forest-400 text-forest-700 font-medium' :
                          !disponivel  ? 'bg-red-50 border-red-100 text-red-300 cursor-not-allowed opacity-60' :
                          'bg-white border-cream-200 text-charcoal-600 hover:border-forest-300'
                        }`}
                      >
                        <p className="font-medium">{m.nome ?? `Mesa ${m.numero}`}</p>
                        <p className="text-[10px] opacity-70">{m.capacidade} pessoas · {!disponivel && !selecionada ? 'ocupada' : disponivel ? 'livre' : ''}</p>
                      </button>
                    );
                  })}
                </div>
                {mesasSel.length > 0 && (
                  <p className="text-xs text-charcoal-500 mt-2">
                    Capacidade selecionada: {mesas.filter(m => mesasSel.includes(m.id)).reduce((s, m) => s + m.capacidade, 0)} lugares
                    {mesas.filter(m => mesasSel.includes(m.id)).reduce((s, m) => s + m.capacidade, 0) < selected.pessoas && (
                      <span className="ml-1 text-red-500">⚠ insuficiente para {selected.pessoas} pessoas</span>
                    )}
                  </p>
                )}
              </div>

              <Textarea
                label="Observações internas"
                value={obsInterna}
                onChange={e => setObsInterna(e.target.value)}
                placeholder="Notas internas..."
                rows={2}
              />

              <div className="flex flex-wrap gap-3 pt-2 border-t border-cream-200">
                {selected.status === 'solicitada' && (
                  <>
                    <Button variant="primary" size="sm" onClick={() => handleConfirmar(selected)} disabled={salvandoRes}>
                      {salvandoRes ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Confirmar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleRecusar(selected)} disabled={salvandoRes}>
                      <X size={13} /> Recusar
                    </Button>
                  </>
                )}
                {selected.status === 'confirmada' && (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleSalvarMesas} disabled={salvandoRes}>
                      {salvandoRes ? <Loader2 size={13} className="animate-spin" /> : null}
                      Salvar mesas
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-charcoal-400">Presença:</span>
                      <Button
                        variant="primary" size="sm"
                        onClick={() => handlePresenca(selected, true)}
                        disabled={salvandoRes}
                        className="bg-forest-500 hover:bg-forest-600"
                      >
                        {salvandoRes ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                        Presente
                      </Button>
                      <Button
                        variant="danger" size="sm"
                        onClick={() => handlePresenca(selected, false)}
                        disabled={salvandoRes}
                      >
                        <UserX size={13} /> No-show
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── MODAL: Nova reserva ────────────────────────────────────────────── */}
      <Modal open={novaModal} onClose={() => setNovaModal(false)} title="Nova Reserva" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome *" value={formNova.nome} onChange={e => setFormNova(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
            <Input label="E-mail" value={formNova.email} onChange={e => setFormNova(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
            <Input label="Telefone" value={formNova.telefone} onChange={e => setFormNova(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
            <Input label="Pessoas" type="number" min="1" value={formNova.pessoas} onChange={e => setFormNova(p => ({ ...p, pessoas: e.target.value }))} />
            <Input label="Data *" type="date" value={formNova.data} onChange={e => setFormNova(p => ({ ...p, data: e.target.value }))} />
            <Input label="Horário *" type="time" value={formNova.horario} onChange={e => setFormNova(p => ({ ...p, horario: e.target.value }))} />
            <Input label="Duração (minutos)" type="number" min="15" value={formNova.duracaoMins} onChange={e => setFormNova(p => ({ ...p, duracaoMins: e.target.value }))} />
          </div>
          <Textarea label="Observações" value={formNova.observacoes} onChange={e => setFormNova(p => ({ ...p, observacoes: e.target.value }))} placeholder="Pedidos especiais, alergias..." rows={2} />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setNovaModal(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleCriarReserva} disabled={salvandoNova || !formNova.nome || !formNova.data || !formNova.horario}>
              {salvandoNova ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Criar reserva
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Mesa ───────────────────────────────────────────────────── */}
      <Modal open={mesaModal} onClose={() => setMesaModal(false)} title={editMesa ? 'Editar Mesa' : 'Nova Mesa'} size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Número/Código *" value={formMesa.numero} onChange={e => setFormMesa(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: 1, A1, Varanda" />
            <Input label="Nome descritivo" value={formMesa.nome} onChange={e => setFormMesa(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Mesa da Janela" />
            <Input label="Capacidade *" type="number" min="1" value={formMesa.capacidade} onChange={e => setFormMesa(p => ({ ...p, capacidade: e.target.value }))} />
            <Input label="Descrição" value={formMesa.descricao} onChange={e => setFormMesa(p => ({ ...p, descricao: e.target.value }))} placeholder="Localização, características..." />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setMesaModal(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleSalvarMesa} disabled={salvandoMesa || !formMesa.numero || !formMesa.capacidade}>
              {salvandoMesa ? <Loader2 size={13} className="animate-spin" /> : null}
              Salvar mesa
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Dia fechado ─────────────────────────────────────────────── */}
      <Modal open={diaFechadoModal} onClose={() => { setDiaFechadoModal(false); setEditDia(null); }} title={editDia ? 'Editar Dia Fechado' : 'Adicionar Dia Fechado'} size="sm">
        <div className="space-y-4">
          <Input label="Data *" type="date" value={formDia.data} onChange={e => setFormDia(p => ({ ...p, data: e.target.value }))} />
          <Input label="Motivo" value={formDia.motivo} onChange={e => setFormDia(p => ({ ...p, motivo: e.target.value }))} placeholder="Ex: Feriado, Evento, Manutenção..." />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setDiaFechadoModal(false); setEditDia(null); }}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleSalvarDia} disabled={salvandoDia || !formDia.data}>
              {salvandoDia ? <Loader2 size={13} className="animate-spin" /> : null}
              {editDia ? 'Salvar alterações' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
