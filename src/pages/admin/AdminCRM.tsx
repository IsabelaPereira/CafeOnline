import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, MessageCircle, Mail, Phone, Tag, Users, ArrowRight,
  Eye, Pencil, SlidersHorizontal, Columns2, X, ChevronDown,
  CreditCard, MapPin, Star, ShoppingBag, Repeat, Calendar, TrendingUp,
  Loader2, GripVertical, Settings2, RotateCcw,
  CheckCircle2, Clock, AlertCircle, CalendarCheck, RefreshCw,
  Download, Upload, Trash2, FileDown, SquareCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card, Button, Modal, Input, Select, Textarea, SectionHeader,
  SearchBar, Tabs, Pagination,
} from '../../components/ui';
import { getLeads, getHistoricoEtapaLead, deleteHistoricoEtapaLead, deleteHistoricoEtapaItem, updateLeadEtapa, addInteracao, updateLeadClienteId, updateLead, getFollowUps, marcarFollowUpFeito, createLead } from '../../services/leads.service';
import { getClientes, updateCliente, updateClientePreferencias, createClienteFromLead, createEndereco } from '../../services/clientes.service';
import { getPedidos } from '../../services/pedidos.service';
import { getAssinaturasCliente, getPlanos } from '../../services/assinaturas.service';
import { getReservasCliente } from '../../services/reservas.service';
import type { Lead, LeadEtapa, Cliente, Pedido, Assinatura, Reserva, HistoricoEtapaLead } from '../../types';

// ── Etapas do funil ───────────────────────────────────────────────────────────

const etapas: { id: LeadEtapa; label: string; color: string }[] = [
  { id: 'novo',                   label: 'Novo Lead',              color: 'bg-blue-100 text-blue-700 border-blue-200'        },
  { id: 'interesse_assinatura',   label: 'Interesse Assinatura',   color: 'bg-gold-100 text-gold-700 border-gold-200'        },
  { id: 'checkout_plano',         label: 'Checkout: Plano',        color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  { id: 'checkout_contato',       label: 'Checkout: Contato',      color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  { id: 'checkout_preferencias',  label: 'Checkout: Preferências', color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  { id: 'checkout_endereco',      label: 'Checkout: Endereço',     color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  { id: 'checkout_pagamento',     label: 'Checkout: Pagamento',    color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  { id: 'checkout_iniciado',      label: 'Checkout Iniciado',      color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  { id: 'pagamento_iniciado',     label: 'Pagamento Iniciado',     color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  { id: 'pagamento_invalido',     label: 'Pagamento Inválido',     color: 'bg-red-100 text-red-700 border-red-200'           },
  { id: 'pagamento_pendente',     label: 'Pagamento Pendente',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200'  },
  { id: 'carrinho-abandonado',    label: 'Carrinho Abandonado',    color: 'bg-rose-100 text-rose-700 border-rose-200'        },
  { id: 'assinatura_concluida',   label: 'Assinatura Concluída',   color: 'bg-forest-100 text-forest-700 border-forest-200'  },
  { id: 'assinatura_cancelada',   label: 'Assinatura Cancelada',  color: 'bg-red-100 text-red-700 border-red-200'           },
  { id: 'compra_concluida',       label: 'Compra Concluída',      color: 'bg-blue-100 text-blue-700 border-blue-200'        },
  { id: 'interesse_reserva',      label: 'Interesse Reserva',      color: 'bg-purple-100 text-purple-700 border-purple-200'  },
  { id: 'cliente_ativo',          label: 'Cliente Ativo',          color: 'bg-forest-100 text-forest-700 border-forest-200'  },
  { id: 'inadimplente',           label: 'Inadimplente',           color: 'bg-red-100 text-red-700 border-red-200'           },
  { id: 'recuperacao',            label: 'Recuperação',            color: 'bg-yellow-100 text-yellow-700 border-yellow-200'  },
  { id: 'perdido',                label: 'Perdido',                color: 'bg-charcoal-100 text-charcoal-600 border-charcoal-200' },
];

// Etapas exibidas como colunas no Funil Visual
const ETAPAS_EXCLUIDAS_FUNIL = new Set<LeadEtapa>([
  'novo', 'interesse_assinatura', 'checkout_iniciado', 'pagamento_iniciado',
  'pagamento_invalido', 'pagamento_pendente', 'cliente_ativo', 'recuperacao',
]);
const etapasFunil = etapas.filter(e => !ETAPAS_EXCLUIDAS_FUNIL.has(e.id));
const FUNIL_DEFAULT_ORDEM = etapasFunil.map(e => e.id);

function LeadCard({ lead, onClick, onDragStart, onDragEnd, colunasVis, nomePlano }: {
  lead: Lead;
  onClick: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  colunasVis?: Set<string>;
  nomePlano?: (id?: string | null) => string;
}) {
  const etapa = etapas.find(e => e.id === lead.etapa);
  const origemIcon: Record<string, string> = {
    checkout: '🛒', reserva: '📅', manual: '✍️', blog: '📝', social: '📱', indicacao: '👥', landing: '🎯',
  };
  const vis = colunasVis ?? new Set(COLUNAS_FUNIL_CARD.filter(c => c.padrao).map(c => c.id));
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={e => { e.stopPropagation(); onDragStart?.(); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="bg-white rounded-sm border border-cream-200 p-4 hover:shadow-md transition-all cursor-grab select-none"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-charcoal-700 text-sm">{lead.nome}</p>
          <p className="text-xs text-charcoal-400">{lead.email}</p>
        </div>
        {vis.has('origem') && <span className="text-sm">{origemIcon[lead.origem] || '📋'}</span>}
      </div>
      {vis.has('plano') && lead.planoDesejado && <p className="text-xs text-forest-600 mb-2">→ {nomePlano ? nomePlano(lead.planoDesejado) : lead.planoDesejado}</p>}
      {vis.has('tags') && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {lead.tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded border border-cream-200">{tag}</span>
          ))}
        </div>
      )}
      {vis.has('followup') && lead.proximoFollowUp && (
        <p className="text-xs text-charcoal-400 mb-1">Follow-up: {new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR')}</p>
      )}
      {vis.has('etapabadge') && etapa && (
        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded border ${etapa.color}`}>{etapa.label}</span>
      )}
    </div>
  );
}

// ── Filtro dinâmico clientes ──────────────────────────────────────────────────

interface FiltroCliente { id: string; campo: string; operador: string; valor: string }

const CAMPOS_CLI = [
  { value: 'name',            label: 'Nome',        tipo: 'texto'      },
  { value: 'email',           label: 'E-mail',      tipo: 'texto'      },
  { value: 'phone',           label: 'Telefone',    tipo: 'texto'      },
  { value: 'cpf',             label: 'CPF',         tipo: 'texto'      },
  { value: 'preferenciaCafe', label: 'Preferência', tipo: 'preferencia'},
  { value: 'createdAt',       label: 'Cliente desde', tipo: 'data'     },
];

const OPERADORES_CLI: Record<string, { value: string; label: string }[]> = {
  texto:      [{ value:'contem',label:'contém'},{ value:'igual',label:'é igual'},{ value:'comeca',label:'começa com'}],
  preferencia:[{ value:'igual',label:'é'},{ value:'diferente',label:'não é'}],
  data:       [{ value:'igual',label:'é'},{ value:'antes',label:'antes de'},{ value:'depois',label:'depois de'}],
};

const COLUNAS_CLI = [
  { id: 'nome',        label: 'Nome',          padrao: true  },
  { id: 'email',       label: 'E-mail',        padrao: true  },
  { id: 'telefone',    label: 'Telefone',       padrao: true  },
  { id: 'preferencia', label: 'Preferência',   padrao: true  },
  { id: 'cpf',         label: 'CPF',           padrao: false },
  { id: 'aniversario', label: 'Aniversário',   padrao: false },
  { id: 'cartao',      label: 'Cartão',        padrao: false },
  { id: 'enderecos',   label: 'Endereços',     padrao: true  },
  { id: 'desde',       label: 'Cliente desde', padrao: true  },
];

function matchCliTexto(t: string, op: string, v: string) {
  if (op === 'contem') return t.includes(v);
  if (op === 'igual')  return t === v;
  if (op === 'comeca') return t.startsWith(v);
  return true;
}
function matchCliData(d: string, op: string, v: string) {
  if (!d || !v) return true;
  const dt = new Date(d).getTime(), dv = new Date(v).getTime();
  if (isNaN(dt) || isNaN(dv)) return true;
  if (op === 'igual')  return d.startsWith(v);
  if (op === 'antes')  return dt < dv;
  if (op === 'depois') return dt > dv;
  return true;
}
function matchCliFiltro(c: Cliente, f: FiltroCliente): boolean {
  if (!f.valor.trim()) return true;
  const v = f.valor.toLowerCase().trim();
  switch (f.campo) {
    case 'name':            return matchCliTexto(c.name.toLowerCase(), f.operador, v);
    case 'email':           return matchCliTexto(c.email.toLowerCase(), f.operador, v);
    case 'phone':           return matchCliTexto(c.phone.toLowerCase(), f.operador, v);
    case 'cpf':             return matchCliTexto((c.cpf ?? '').replace(/\D/g,''), f.operador, v.replace(/\D/g,''));
    case 'preferenciaCafe': return f.operador === 'diferente' ? c.preferenciaCafe !== f.valor : c.preferenciaCafe === f.valor;
    case 'createdAt':       return matchCliData(c.createdAt, f.operador, f.valor);
    default: return true;
  }
}

// ── Filtro dinâmico leads ─────────────────────────────────────────────────────

interface FiltroLead { id: string; campo: string; operador: string; valor: string }

const CAMPOS_LEAD = [
  { value: 'nome',            label: 'Nome',             tipo: 'texto'   },
  { value: 'email',           label: 'E-mail',           tipo: 'texto'   },
  { value: 'telefone',        label: 'Telefone',         tipo: 'texto'   },
  { value: 'origem',          label: 'Origem',           tipo: 'origem'  },
  { value: 'etapa',           label: 'Etapa',            tipo: 'etapa'   },
  { value: 'planoDesejado',   label: 'Plano',            tipo: 'texto'   },
  { value: 'tags',            label: 'Tags',             tipo: 'texto'   },
  { value: 'responsavel',     label: 'Responsável',      tipo: 'texto'   },
  { value: 'proximoFollowUp', label: 'Follow-up',        tipo: 'data'    },
  { value: 'ultimoContato',   label: 'Último contato',   tipo: 'data'    },
  { value: 'createdAt',       label: 'Data de entrada',  tipo: 'data'    },
];

const OPERADORES_LEAD: Record<string, { value: string; label: string }[]> = {
  texto:  [{ value:'contem',label:'contém'},{ value:'igual',label:'é igual'},{ value:'comeca',label:'começa com'},{ value:'vazio',label:'está vazio'}],
  origem: [{ value:'igual',label:'é'},{ value:'diferente',label:'não é'}],
  etapa:  [{ value:'igual',label:'é'},{ value:'diferente',label:'não é'}],
  data:   [{ value:'tem',label:'tem data'},{ value:'nao_tem',label:'sem data'},{ value:'antes',label:'antes de'},{ value:'depois',label:'depois de'},{ value:'igual',label:'na data'}],
};

const COLUNAS_LEAD = [
  { id: 'nome',        label: 'Nome',            padrao: true  },
  { id: 'contato',     label: 'Contato',         padrao: true  },
  { id: 'origem',      label: 'Origem',          padrao: true  },
  { id: 'etapa',       label: 'Etapa',           padrao: true  },
  { id: 'plano',       label: 'Plano',           padrao: true  },
  { id: 'followup',    label: 'Follow-up',       padrao: true  },
  { id: 'tags',        label: 'Tags',            padrao: false },
  { id: 'responsavel', label: 'Responsável',     padrao: false },
  { id: 'observacoes', label: 'Observações',     padrao: false },
  { id: 'criado',      label: 'Data de entrada', padrao: false },
];

const COLUNAS_FUNIL_CARD = [
  { id: 'origem',    label: 'Ícone de origem', padrao: true  },
  { id: 'plano',     label: 'Plano desejado',  padrao: true  },
  { id: 'tags',      label: 'Tags',            padrao: true  },
  { id: 'followup',  label: 'Follow-up',       padrao: true  },
  { id: 'etapabadge',label: 'Badge de etapa',  padrao: false },
];

function matchLeadTexto(t: string, op: string, v: string) {
  if (op === 'vazio')  return !t.trim();
  if (op === 'contem') return t.includes(v);
  if (op === 'igual')  return t === v;
  if (op === 'comeca') return t.startsWith(v);
  return true;
}
function matchLeadData(d: string | undefined, op: string, v: string) {
  if (op === 'tem')    return !!d;
  if (op === 'nao_tem') return !d;
  if (!d) return true;
  if (!v) return true;
  const dt = new Date(d).getTime(), dv = new Date(v).getTime();
  if (isNaN(dt) || isNaN(dv)) return true;
  if (op === 'igual')  return d.startsWith(v);
  if (op === 'antes')  return dt < dv;
  if (op === 'depois') return dt > dv;
  return true;
}
function matchLeadFiltro(l: Lead, f: FiltroLead): boolean {
  const isDataOp = f.operador === 'tem' || f.operador === 'nao_tem';
  if (!f.valor.trim() && !isDataOp) return true;
  const v = f.valor.toLowerCase().trim();
  switch (f.campo) {
    case 'nome':            return matchLeadTexto(l.nome.toLowerCase(), f.operador, v);
    case 'email':           return matchLeadTexto(l.email.toLowerCase(), f.operador, v);
    case 'telefone':        return matchLeadTexto((l.telefone ?? '').toLowerCase(), f.operador, v);
    case 'planoDesejado':   return matchLeadTexto((l.planoDesejado ?? '').toLowerCase(), f.operador, v);
    case 'responsavel':     return matchLeadTexto((l.responsavel ?? '').toLowerCase(), f.operador, v);
    case 'tags':            return l.tags.some(t => t.toLowerCase().includes(v));
    case 'origem':          return f.operador === 'diferente' ? l.origem !== f.valor : l.origem === f.valor;
    case 'etapa':           return f.operador === 'diferente' ? l.etapa  !== f.valor : l.etapa  === f.valor;
    case 'proximoFollowUp': return matchLeadData(l.proximoFollowUp, f.operador, f.valor);
    case 'ultimoContato':   return matchLeadData(l.ultimoContato,   f.operador, f.valor);
    case 'createdAt':       return matchLeadData(l.createdAt,        f.operador, f.valor);
    default: return true;
  }
}

// ── FollowUpTab ───────────────────────────────────────────────────────────────

function FollowUpTab({
  followUps,
  loading,
  userName,
  etapas,
  onUpdated,
  onVerLead,
  nomePlano,
}: {
  followUps: Lead[];
  loading: boolean;
  userName: string;
  etapas: { id: LeadEtapa; label: string; color: string }[];
  onUpdated: () => void;
  onVerLead: (lead: Lead) => void;
  nomePlano?: (id?: string | null) => string;
}) {
  const now = new Date();
  const [marcarModal, setMarcarModal] = useState<Lead | null>(null);
  const [reagendarModal, setReagendarModal] = useState<Lead | null>(null);
  const [obs, setObs] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'vencidos' | 'hoje' | 'proximos'>('todos');

  // ── Filtros + colunas ─────────────────────────────────────────────────────
  const COLUNAS_FU = [
    { id: 'etapa',       label: 'Etapa',          padrao: true  },
    { id: 'email',       label: 'E-mail',         padrao: true  },
    { id: 'plano',       label: 'Plano desejado', padrao: false },
    { id: 'tags',        label: 'Tags',           padrao: false },
    { id: 'observacoes', label: 'Observações',    padrao: true  },
  ];
  const [filtrosFU, setFiltrosFU]           = useState<FiltroLead[]>([]);
  const [mostrarFiltrosFU, setMostrarFiltrosFU] = useState(false);
  const [colunasFUVis, setColunasFUVis]     = useState<Set<string>>(
    new Set(COLUNAS_FU.filter(c => c.padrao).map(c => c.id)),
  );
  const [mostrarColunasFU, setMostrarColunasFU] = useState(false);
  const colunasFURef = useRef<HTMLDivElement>(null);

  function adicionarFiltroFU() {
    setFiltrosFU(prev => [...prev, { id: crypto.randomUUID(), campo: 'nome', operador: 'contem', valor: '' }]);
    setMostrarFiltrosFU(true);
  }
  function atualizarFiltroFU(id: string, patch: Partial<FiltroLead>) {
    setFiltrosFU(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  // ── Bulk state ─────────────────────────────────────────────────────────────
  const [selectedFU, setSelectedFU]     = useState<Set<string>>(new Set());
  const [bulkFUModal, setBulkFUModal]   = useState<'editar' | 'reagendar' | null>(null);
  const [bulkFUField, setBulkFUField]   = useState<'etapa' | 'observacoes' | 'tags'>('etapa');
  const [bulkFUValue, setBulkFUValue]   = useState('');
  const [bulkFUData, setBulkFUData]     = useState('');
  const [bulkFUHora, setBulkFUHora]     = useState('');
  const [bulkFUando, setBulkFUando]     = useState(false);

  function toggleSelectFU(id: string) {
    setSelectedFU(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleSelectAllFU(list: Lead[]) {
    if (selectedFU.size === list.length && list.length > 0) setSelectedFU(new Set());
    else setSelectedFU(new Set(list.map(l => l.id)));
  }

  async function handleBulkFUFeito() {
    if (selectedFU.size === 0) return;
    setBulkFUando(true);
    try {
      await Promise.all([...selectedFU].map(id =>
        marcarFollowUpFeito(id, 'Follow-up realizado em massa', userName),
      ));
      setSelectedFU(new Set());
      onUpdated();
    } finally { setBulkFUando(false); }
  }

  async function handleBulkFUReagendar() {
    if (!bulkFUData) return;
    setBulkFUando(true);
    try {
      const dt = bulkFUHora ? `${bulkFUData}T${bulkFUHora}:00` : `${bulkFUData}T09:00:00`;
      const dtFormatada = new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      await Promise.all([...selectedFU].map(id =>
        updateLead(id, { proximoFollowUp: dt })
          .then(() => addInteracao(id, 'anotacao', `Follow-up reagendado para ${dtFormatada}`, userName)),
      ));
      setBulkFUModal(null); setBulkFUData(''); setBulkFUHora('');
      setSelectedFU(new Set());
      onUpdated();
    } finally { setBulkFUando(false); }
  }

  async function handleBulkFUEdit() {
    if (selectedFU.size === 0) return;
    setBulkFUando(true);
    try {
      const patch: Parameters<typeof updateLead>[1] = {};
      if (bulkFUField === 'etapa')       patch.etapa = bulkFUValue as LeadEtapa;
      if (bulkFUField === 'observacoes') patch.observacoes = bulkFUValue;
      if (bulkFUField === 'tags')        patch.tags = bulkFUValue.split(',').map(t => t.trim()).filter(Boolean);
      await Promise.all([...selectedFU].map(id => updateLead(id, patch)));
      setBulkFUModal(null); setBulkFUValue('');
      setSelectedFU(new Set());
      onUpdated();
    } finally { setBulkFUando(false); }
  }

  const vencidos = followUps.filter(l => l.proximoFollowUp && new Date(l.proximoFollowUp) < now);
  const hoje     = followUps.filter(l => {
    if (!l.proximoFollowUp) return false;
    const d = new Date(l.proximoFollowUp);
    return d >= now && d.toDateString() === now.toDateString();
  });
  const proximos = followUps.filter(l => {
    if (!l.proximoFollowUp) return false;
    const d = new Date(l.proximoFollowUp);
    const amanha = new Date(now); amanha.setDate(amanha.getDate() + 1);
    return d > now && d.toDateString() !== now.toDateString();
  });

  const listagem = filtro === 'vencidos' ? vencidos
    : filtro === 'hoje' ? hoje
    : filtro === 'proximos' ? proximos
    : followUps;

  const listagemFiltrada = (filtrosFU.length === 0
    ? listagem
    : listagem.filter(l => filtrosFU.every(f => matchLeadFiltro(l, f)))
  );

  async function handleMarcarFeito() {
    if (!marcarModal) return;
    setSalvando(true);
    try {
      // marcarFollowUpFeito já limpa proximo_follow_up e registra interação se obs informado
      // Garante que sempre registra a conclusão, mesmo sem observação
      const descricao = obs.trim() || 'Follow-up realizado';
      await marcarFollowUpFeito(marcarModal.id, descricao, userName);
      setMarcarModal(null); setObs('');
      onUpdated();
    } finally { setSalvando(false); }
  }

  async function handleReagendar() {
    if (!reagendarModal || !novaData) return;
    setSalvando(true);
    try {
      const dt = novaHora ? `${novaData}T${novaHora}:00` : `${novaData}T09:00:00`;
      const dtFormatada = new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      await updateLead(reagendarModal.id, { proximoFollowUp: dt });
      // Registra o reagendamento como interação
      await addInteracao(
        reagendarModal.id,
        'anotacao',
        `Follow-up reagendado para ${dtFormatada}`,
        userName,
      );
      setReagendarModal(null); setNovaData(''); setNovaHora('');
      onUpdated();
    } finally { setSalvando(false); }
  }

  function fmtFollowUp(iso: string) {
    const d = new Date(iso);
    const diff = d.getTime() - now.getTime();
    const days = Math.round(diff / 86400000);
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 0) return `Vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''} · ${time}`;
    if (days === 0) return `Hoje · ${time}`;
    if (days === 1) return `Amanhã · ${time}`;
    return `${d.toLocaleDateString('pt-BR')} · ${time}`;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setFiltro('vencidos')}
          className={`p-4 rounded-sm border-2 text-left transition-colors ${filtro === 'vencidos' ? 'border-red-400 bg-red-50' : 'border-cream-200 bg-white hover:border-red-300'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-charcoal-500">Vencidos</span>
          </div>
          <p className="text-2xl font-serif text-red-600">{vencidos.length}</p>
        </button>
        <button onClick={() => setFiltro('hoje')}
          className={`p-4 rounded-sm border-2 text-left transition-colors ${filtro === 'hoje' ? 'border-amber-400 bg-amber-50' : 'border-cream-200 bg-white hover:border-amber-300'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-charcoal-500">Hoje</span>
          </div>
          <p className="text-2xl font-serif text-amber-600">{hoje.length}</p>
        </button>
        <button onClick={() => setFiltro('proximos')}
          className={`p-4 rounded-sm border-2 text-left transition-colors ${filtro === 'proximos' ? 'border-forest-400 bg-forest-50' : 'border-cream-200 bg-white hover:border-forest-300'}`}>
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck size={16} className="text-forest-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-charcoal-500">Próximos</span>
          </div>
          <p className="text-2xl font-serif text-forest-600">{proximos.length}</p>
        </button>
      </div>

      {/* Toolbar: filtros + colunas + filtros de período */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de período */}
          {(['todos', 'vencidos', 'hoje', 'proximos'] as const).map(f => (
            <button key={f} onClick={() => { setFiltro(f); setSelectedFU(new Set()); }}
              className={`px-3 py-1.5 text-xs rounded-sm border transition-colors capitalize ${
                filtro === f ? 'bg-charcoal-700 text-cream-100 border-charcoal-700' : 'bg-white text-charcoal-500 border-cream-300 hover:border-charcoal-400'
              }`}>
              {f === 'todos' ? 'Todos' : f === 'vencidos' ? 'Vencidos' : f === 'hoje' ? 'Hoje' : 'Próximos'}
            </button>
          ))}

          <div className="h-4 w-px bg-cream-200" />

          {/* Filtros dinâmicos */}
          <button
            onClick={() => setMostrarFiltrosFU(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border transition-colors ${mostrarFiltrosFU || filtrosFU.length > 0 ? 'bg-forest-50 border-forest-300 text-forest-700' : 'bg-white text-charcoal-500 border-cream-300 hover:border-forest-300'}`}
          >
            <SlidersHorizontal size={12} /> Filtros
            {filtrosFU.length > 0 && <span className="ml-0.5 bg-forest-500 text-white text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">{filtrosFU.length}</span>}
            <ChevronDown size={10} className={`transition-transform ${mostrarFiltrosFU ? 'rotate-180' : ''}`} />
          </button>

          {/* Colunas */}
          <div className="relative" ref={colunasFURef}>
            <button
              onClick={() => setMostrarColunasFU(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border transition-colors ${mostrarColunasFU ? 'bg-forest-50 border-forest-300 text-forest-700' : 'bg-white text-charcoal-500 border-cream-300 hover:border-forest-300'}`}
            >
              <Columns2 size={12} /> Campos
              <ChevronDown size={10} className={`transition-transform ${mostrarColunasFU ? 'rotate-180' : ''}`} />
            </button>
            {mostrarColunasFU && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-cream-200 rounded-sm shadow-lg p-3 w-44 space-y-1">
                {COLUNAS_FU.map(col => (
                  <label key={col.id} className="flex items-center gap-2 text-sm text-charcoal-600 cursor-pointer hover:text-charcoal-800 py-0.5">
                    <input type="checkbox" checked={colunasFUVis.has(col.id)} onChange={() => setColunasFUVis(prev => { const s = new Set(prev); s.has(col.id) ? s.delete(col.id) : s.add(col.id); return s; })} className="w-3.5 h-3.5 accent-forest-500" />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {filtrosFU.length > 0 && (
            <button onClick={() => setFiltrosFU([])} className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2">Limpar filtros</button>
          )}

          <span className="ml-auto text-xs text-charcoal-400">{listagemFiltrada.length} follow-up{listagemFiltrada.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Painel de filtros dinâmicos */}
        {mostrarFiltrosFU && (
          <div className="px-3 py-3 bg-cream-50 border border-cream-200 rounded-sm space-y-2">
            {filtrosFU.length === 0 && <p className="text-xs text-charcoal-400">Nenhum filtro ativo.</p>}
            {filtrosFU.map(f => {
              const tipo = CAMPOS_LEAD.find(c => c.value === f.campo)?.tipo ?? 'texto';
              const ops  = OPERADORES_LEAD[tipo] ?? OPERADORES_LEAD.texto;
              const semValor = f.operador === 'tem' || f.operador === 'nao_tem';
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-2">
                  <select value={f.campo} onChange={e => atualizarFiltroFU(f.id, { campo: e.target.value, operador: (OPERADORES_LEAD[CAMPOS_LEAD.find(c=>c.value===e.target.value)?.tipo??'texto']??OPERADORES_LEAD.texto)[0].value, valor: '' })} className="px-2 py-1.5 text-xs border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                    {CAMPOS_LEAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <select value={f.operador} onChange={e => atualizarFiltroFU(f.id, { operador: e.target.value })} className="px-2 py-1.5 text-xs border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                    {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!semValor && (
                    tipo === 'origem' ? (
                      <select value={f.valor} onChange={e => atualizarFiltroFU(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-xs border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                        <option value="">Selecione…</option>
                        {['manual','checkout','reserva','blog','social','indicacao','landing'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : tipo === 'etapa' ? (
                      <select value={f.valor} onChange={e => atualizarFiltroFU(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-xs border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                        <option value="">Selecione…</option>
                        {etapas.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    ) : tipo === 'data' ? (
                      <input type="date" value={f.valor} onChange={e => atualizarFiltroFU(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-xs border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    ) : (
                      <input type="text" value={f.valor} onChange={e => atualizarFiltroFU(f.id, { valor: e.target.value })} placeholder="Valor…" className="w-40 px-2 py-1.5 text-xs border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    )
                  )}
                  <button onClick={() => setFiltrosFU(prev => prev.filter(x => x.id !== f.id))} className="p-1 text-charcoal-400 hover:text-red-500 rounded-sm transition-colors"><X size={12} /></button>
                </div>
              );
            })}
            <button onClick={adicionarFiltroFU} className="flex items-center gap-1.5 text-xs text-forest-600 hover:text-forest-700 font-medium mt-1">
              <Plus size={12} /> Adicionar filtro
            </button>
          </div>
        )}
      </div>

      {/* Bulk bar */}
      {selectedFU.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-2 px-3 bg-forest-50 border border-forest-200 rounded-sm">
          <span className="text-sm font-medium text-charcoal-600">
            <SquareCheck size={14} className="inline mr-1.5 text-forest-500" />
            {selectedFU.size} selecionado{selectedFU.size !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setSelectedFU(new Set(listagemFiltrada.map(l => l.id)))} className="text-xs text-forest-600 hover:text-forest-700 underline underline-offset-2">
            Selecionar todos ({listagemFiltrada.length})
          </button>
          <button onClick={() => setSelectedFU(new Set())} className="text-xs text-charcoal-400 hover:text-charcoal-600 underline underline-offset-2">
            Desmarcar
          </button>
          <div className="h-4 w-px bg-cream-300" />
          <button
            onClick={handleBulkFUFeito}
            disabled={bulkFUando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-forest-500 text-white rounded-sm hover:bg-forest-600 disabled:opacity-60 transition-colors"
          >
            {bulkFUando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Marcar feitos
          </button>
          <button
            onClick={() => { setBulkFUData(''); setBulkFUHora(''); setBulkFUModal('reagendar'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-sm hover:bg-amber-50 transition-colors"
          >
            <Calendar size={12} /> Reagendar
          </button>
          <button
            onClick={() => { setBulkFUField('etapa'); setBulkFUValue(''); setBulkFUModal('editar'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-cream-300 text-charcoal-600 rounded-sm hover:bg-cream-50 transition-colors"
          >
            <Pencil size={12} /> Editar
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-charcoal-400">
          <RefreshCw size={16} className="animate-spin" /> Carregando follow-ups...
        </div>
      ) : listagemFiltrada.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-charcoal-300">
          <CalendarCheck size={40} className="opacity-40" />
          <p className="text-sm">
            {filtrosFU.length > 0 ? 'Nenhum resultado para os filtros aplicados' : `Nenhum follow-up ${filtro !== 'todos' ? `na categoria "${filtro}"` : 'agendado'}`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select-all row */}
          {listagemFiltrada.length > 0 && (
            <div className="flex items-center gap-2 px-1 pb-1 border-b border-cream-100">
              <input
                type="checkbox"
                checked={listagemFiltrada.length > 0 && selectedFU.size === listagemFiltrada.length}
                onChange={() => toggleSelectAllFU(listagemFiltrada)}
                className="w-3.5 h-3.5 accent-forest-500 cursor-pointer"
              />
              <span className="text-xs text-charcoal-400">Selecionar todos desta página</span>
            </div>
          )}

          {listagemFiltrada.map(lead => {
            const etapa = etapas.find(e => e.id === lead.etapa);
            const isVencido = lead.proximoFollowUp ? new Date(lead.proximoFollowUp) < now : false;
            const isFUSelected = selectedFU.has(lead.id);
            return (
              <div key={lead.id}
                onClick={() => onVerLead(lead)}
                className={`flex items-center gap-4 p-4 bg-white rounded-sm border transition-all cursor-pointer ${
                  isFUSelected
                    ? 'border-forest-300 bg-forest-50/60'
                    : isVencido
                    ? 'border-red-200 bg-red-50/30 hover:border-red-400 hover:shadow-sm'
                    : 'border-cream-200 hover:border-forest-300 hover:shadow-sm'
                }`}>
                {/* Checkbox */}
                <div onClick={e => { e.stopPropagation(); toggleSelectFU(lead.id); }} className="flex-shrink-0">
                  <input type="checkbox" checked={isFUSelected} onChange={() => toggleSelectFU(lead.id)}
                    className="w-3.5 h-3.5 accent-forest-500 cursor-pointer" />
                </div>

                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isVencido ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  {isVencido
                    ? <AlertCircle size={14} className="text-red-500" />
                    : <Clock size={14} className="text-amber-500" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-charcoal-700">{lead.nome}</p>
                    {colunasFUVis.has('etapa') && etapa && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded border ${etapa.color}`}>{etapa.label}</span>
                    )}
                  </div>
                  {colunasFUVis.has('email') && <p className="text-xs text-charcoal-400">{lead.email}</p>}
                  {lead.proximoFollowUp && (
                    <p className={`text-xs font-medium mt-0.5 ${isVencido ? 'text-red-500' : 'text-amber-600'}`}>
                      {fmtFollowUp(lead.proximoFollowUp)}
                    </p>
                  )}
                  {colunasFUVis.has('plano') && lead.planoDesejado && (
                    <p className="text-xs text-forest-600 mt-0.5">→ {nomePlano ? nomePlano(lead.planoDesejado) : lead.planoDesejado}</p>
                  )}
                  {colunasFUVis.has('tags') && (lead.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-[10px] rounded border border-cream-200">{t}</span>)}
                    </div>
                  )}
                  {colunasFUVis.has('observacoes') && lead.observacoes && (
                    <p className="text-xs text-charcoal-400 mt-0.5 line-clamp-1">{lead.observacoes}</p>
                  )}
                </div>

                {/* Actions — stopPropagation to prevent row click */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setReagendarModal(lead); setNovaData(''); setNovaHora(''); }}
                    className="p-1.5 text-charcoal-400 hover:text-amber-500 hover:bg-amber-50 rounded-sm transition-colors" title="Reagendar">
                    <Calendar size={14} />
                  </button>
                  <button onClick={() => { setMarcarModal(lead); setObs(''); }}
                    className="p-1.5 text-charcoal-400 hover:text-forest-600 hover:bg-forest-50 rounded-sm transition-colors" title="Marcar como feito">
                    <CheckCircle2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal bulk — reagendar */}
      {bulkFUModal === 'reagendar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={() => setBulkFUModal(null)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-sm border border-cream-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-cream-50">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Reagendar em massa</p>
                <h3 className="font-editorial text-lg text-charcoal-700">{selectedFU.size} follow-up{selectedFU.size !== 1 ? 's' : ''}</h3>
              </div>
              <button onClick={() => setBulkFUModal(null)} className="text-charcoal-400 hover:text-charcoal-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Nova data</label>
                <input type="date" value={bulkFUData} onChange={e => setBulkFUData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Horário (opcional)</label>
                <input type="time" value={bulkFUHora} onChange={e => setBulkFUHora(e.target.value)}
                  className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
                <Button variant="ghost" onClick={() => setBulkFUModal(null)} disabled={bulkFUando}>Cancelar</Button>
                <Button variant="primary" onClick={handleBulkFUReagendar} disabled={bulkFUando || !bulkFUData}>
                  {bulkFUando ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                  {bulkFUando ? 'Reagendando…' : `Reagendar ${selectedFU.size}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal bulk — editar */}
      {bulkFUModal === 'editar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={() => setBulkFUModal(null)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-sm border border-cream-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-cream-50">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Editar em massa</p>
                <h3 className="font-editorial text-lg text-charcoal-700">{selectedFU.size} follow-up{selectedFU.size !== 1 ? 's' : ''}</h3>
              </div>
              <button onClick={() => setBulkFUModal(null)} className="text-charcoal-400 hover:text-charcoal-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Campo</label>
                <select value={bulkFUField} onChange={e => { setBulkFUField(e.target.value as typeof bulkFUField); setBulkFUValue(''); }}
                  className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                  <option value="etapa">Etapa</option>
                  <option value="observacoes">Observações (substituir)</option>
                  <option value="tags">Tags (substituir)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Valor</label>
                {bulkFUField === 'etapa' ? (
                  <select value={bulkFUValue} onChange={e => setBulkFUValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                    <option value="">Selecione…</option>
                    {etapas.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                ) : bulkFUField === 'observacoes' ? (
                  <textarea value={bulkFUValue} onChange={e => setBulkFUValue(e.target.value)} rows={3}
                    className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400 resize-none" />
                ) : (
                  <input type="text" value={bulkFUValue} onChange={e => setBulkFUValue(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
                <Button variant="ghost" onClick={() => setBulkFUModal(null)} disabled={bulkFUando}>Cancelar</Button>
                <Button variant="primary" onClick={handleBulkFUEdit} disabled={bulkFUando || !bulkFUValue.trim()}>
                  {bulkFUando ? <Loader2 size={14} className="animate-spin" /> : <SquareCheck size={14} />}
                  {bulkFUando ? 'Aplicando…' : `Aplicar a ${selectedFU.size}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — marcar feito */}
      {marcarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={() => setMarcarModal(null)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md border border-cream-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-cream-50">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Follow-up realizado</p>
                <h3 className="font-editorial text-lg text-charcoal-700">{marcarModal.nome}</h3>
              </div>
              <button onClick={() => setMarcarModal(null)} className="text-charcoal-400 hover:text-charcoal-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
                  Observação (opcional)
                </label>
                <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                  placeholder="Como foi o contato? O que ficou combinado?"
                  className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm resize-none focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
                <Button variant="ghost" onClick={() => setMarcarModal(null)} disabled={salvando}>Cancelar</Button>
                <Button variant="primary" onClick={handleMarcarFeito} disabled={salvando}>
                  {salvando ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {salvando ? 'Salvando...' : 'Marcar como feito'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — reagendar */}
      {reagendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={() => setReagendarModal(null)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-sm border border-cream-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-cream-50">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Reagendar follow-up</p>
                <h3 className="font-editorial text-lg text-charcoal-700">{reagendarModal.nome}</h3>
              </div>
              <button onClick={() => setReagendarModal(null)} className="text-charcoal-400 hover:text-charcoal-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Data</label>
                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Horário (opcional)</label>
                <input type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)}
                  className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
                <Button variant="ghost" onClick={() => setReagendarModal(null)} disabled={salvando}>Cancelar</Button>
                <Button variant="primary" onClick={handleReagendar} disabled={salvando || !novaData}>
                  {salvando ? <RefreshCw size={14} className="animate-spin" /> : <Calendar size={14} />}
                  {salvando ? 'Salvando...' : 'Reagendar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

function pathToTab(pathname: string) {
  if (pathname.includes('/followup')) return 'followup';
  if (pathname.includes('/clientes'))  return 'clientes';
  if (pathname.includes('/leads'))     return 'lista';
  return 'funil';
}

export function AdminCRM() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Leads ──────────────────────────────────────────────────────────────────
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [tab, setTab]                   = useState(() => pathToTab(location.pathname));
  const [followUps, setFollowUps]       = useState<Lead[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  // ── Bulk selection + edit + export + import ────────────────────────────────
  const [selectedLeads, setSelectedLeads]   = useState<Set<string>>(new Set());
  const [bulkEditModal, setBulkEditModal]   = useState(false);
  const [bulkEditField, setBulkEditField]   = useState<'etapa' | 'responsavel' | 'proximoFollowUp' | 'tags' | 'observacoes'>('etapa');
  const [bulkEditValue, setBulkEditValue]   = useState('');
  const [bulkEditando, setBulkEditando]     = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const exportRef                           = useRef<HTMLDivElement>(null);
  const [importModal, setImportModal]       = useState(false);
  const [importPreview, setImportPreview]   = useState<{ nome: string; email: string; telefone: string; origem: string; etapa: LeadEtapa }[]>([]);
  const [importando, setImportando]         = useState(false);
  const importFileRef                       = useRef<HTMLInputElement>(null);

  // ── Filtros e colunas — Leads ──────────────────────────────────────────────
  const [filtrosLead, setFiltrosLead]           = useState<FiltroLead[]>([]);
  const [mostrarFiltrosLead, setMostrarFiltrosLead] = useState(false);
  const [colunasLeadVis, setColunasLeadVis]     = useState<Set<string>>(
    () => new Set(COLUNAS_LEAD.filter(c => c.padrao).map(c => c.id)),
  );
  const [mostrarColunasLead, setMostrarColunasLead] = useState(false);
  const colunasLeadRef = useRef<HTMLDivElement>(null);

  // ── Colunas cards Funil ────────────────────────────────────────────────────
  const [colunasFunilCard, setColunasFunilCard] = useState<Set<string>>(
    () => new Set(COLUNAS_FUNIL_CARD.filter(c => c.padrao).map(c => c.id)),
  );
  const [mostrarColunasFunil, setMostrarColunasFunil] = useState(false);
  const colunasFunilRef = useRef<HTMLDivElement>(null);

  // ── Clientes bulk ──────────────────────────────────────────────────────────
  const [selectedClis, setSelectedClis]         = useState<Set<string>>(new Set());
  const [bulkCliModal, setBulkCliModal]         = useState(false);
  const [bulkCliField, setBulkCliField]         = useState<'preferenciaCafe' | 'tipoMoagem'>('preferenciaCafe');
  const [bulkCliValue, setBulkCliValue]         = useState('');
  const [bulkCliando, setBulkCliando]           = useState(false);

  // Sync tab → URL and URL → tab
  useEffect(() => { setTab(pathToTab(location.pathname)); }, [location.pathname]);
  const [search, setSearch]             = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [novoModal, setNovoModal]       = useState(false);
  const [planosMap, setPlanosMap]       = useState<Record<string, string>>({});
  const nomePlano = (id?: string | null) => id ? (planosMap[id] || id) : '';

  // ── Clientes ───────────────────────────────────────────────────────────────
  const [clientes, setClientes]               = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch]     = useState('');
  const [clientePage, setClientePage]         = useState(1);
  const [filtrosCli, setFiltrosCli]           = useState<FiltroCliente[]>([]);
  const [mostrarFiltrosCli, setMostrarFiltrosCli] = useState(false);
  const [mostrarColunasCli, setMostrarColunasCli] = useState(false);
  const [colunasVis, setColunasVis]           = useState<Set<string>>(
    () => new Set(COLUNAS_CLI.filter(c => c.padrao).map(c => c.id)),
  );
  const colunasRef  = useRef<HTMLDivElement>(null);
  const kanbanRef   = useRef<HTMLDivElement>(null);
  const kanbanDrag  = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [editandoCli, setEditandoCli]         = useState(false);
  const [formCli, setFormCli]                 = useState({
    name: '', phone: '', cpf: '', birthdate: '', preferenciaCafe: 'grao' as 'grao' | 'moido', tipoMoagem: '',
  });
  const [salvandoCli, setSalvandoCli] = useState(false);
  const perPageCli = 15;

  // ── Histórico do cliente ───────────────────────────────────────────────────
  const [cliDetalheTab, setCliDetalheTab] = useState<'dados' | 'pedidos' | 'assinaturas' | 'reservas' | 'funil'>('dados');
  const [cliHist, setCliHist] = useState<{
    pedidos: Pedido[]; assinaturas: Assinatura[]; reservas: Reserva[]; loading: boolean;
  }>({ pedidos: [], assinaturas: [], reservas: [], loading: false });

  // ── Preferências do funil (por usuário, persistidas em localStorage) ────────
  const { user } = useAuth();
  const [funilOrdem,    setFunilOrdem]    = useState<LeadEtapa[]>(FUNIL_DEFAULT_ORDEM);
  const [funilVisiveis, setFunilVisiveis] = useState<Set<LeadEtapa>>(new Set(FUNIL_DEFAULT_ORDEM));
  const [showFunilConfig, setShowFunilConfig] = useState(false);
  const funilConfigRef = useRef<HTMLDivElement>(null);
  // drag no painel de configuração
  const [dragCfgSrc,  setDragCfgSrc]  = useState<LeadEtapa | null>(null);
  // drag direto nas colunas do funil
  const [dragColSrc,  setDragColSrc]  = useState<LeadEtapa | null>(null);
  const [dragColOver, setDragColOver] = useState<LeadEtapa | null>(null);
  // drag de cards entre colunas
  const [dragCardLeadId, setDragCardLeadId] = useState<string | null>(null);
  const [dragCardOver,   setDragCardOver]   = useState<LeadEtapa | null>(null);

  // ── Atualização de etapa ───────────────────────────────────────────────────
  const [atualizandoEtapa, setAtualizandoEtapa] = useState<string | null>(null);

  // ── Converter em cliente ───────────────────────────────────────────────────
  const [converterModal, setConverterModal] = useState(false);
  const [salvandoConverte, setSalvandoConverte] = useState(false);
  const [formConverte, setFormConverte] = useState({
    nome: '', email: '', telefone: '', cpf: '', birthdate: '',
    preferenciaCafe: 'grao' as 'grao' | 'moido', tipoMoagem: '',
    // endereço
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  });

  async function handleConverterEmCliente() {
    if (!selectedLead) return;
    setSalvandoConverte(true);
    try {
      const clienteId = await createClienteFromLead({
        nome:            formConverte.nome.trim(),
        email:           formConverte.email.trim(),
        phone:           formConverte.telefone,
        cpf:             formConverte.cpf,
        birthdate:       formConverte.birthdate || undefined,
        preferenciaCafe: formConverte.preferenciaCafe,
        tipoMoagem:      formConverte.preferenciaCafe === 'moido' ? formConverte.tipoMoagem : undefined,
      });
      if (formConverte.cep && formConverte.logradouro) {
        await createEndereco(clienteId, {
          cep: formConverte.cep, logradouro: formConverte.logradouro,
          numero: formConverte.numero, complemento: formConverte.complemento || undefined,
          bairro: formConverte.bairro, cidade: formConverte.cidade, estado: formConverte.estado,
          padrao: true,
        });
      }
      await updateLeadClienteId(selectedLead.id, clienteId);
      await handleAtualizarEtapaLead(selectedLead.id, 'cliente_ativo' as LeadEtapa);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, clienteId } : l));
      setSelectedLead(prev => prev ? { ...prev, clienteId } : prev);
      const novosClientes = await getClientes();
      setClientes(novosClientes);
      setConverterModal(false);
    } catch (err: any) {
      alert(`Erro ao converter: ${err?.message ?? 'tente novamente.'}`);
    } finally {
      setSalvandoConverte(false);
    }
  }

  // ── Nova interação ─────────────────────────────────────────────────────────
  const [novaInteracaoModal, setNovaInteracaoModal] = useState(false);
  const [formInter, setFormInter] = useState<{ tipo: 'email' | 'whatsapp' | 'ligacao'; descricao: string }>({
    tipo: 'email', descricao: '',
  });
  const [salvandoInter, setSalvandoInter] = useState(false);

  // ── Histórico de etapa por lead ────────────────────────────────────────────
  const [leadHistorico, setLeadHistorico] = useState<Record<string, HistoricoEtapaLead[]>>({});
  const [leadHistLoading, setLeadHistLoading] = useState<Record<string, boolean>>({});
  const [deletandoHistorico, setDeletandoHistorico] = useState<string | null>(null);

  async function carregarHistoricoLead(leadId: string) {
    if (leadHistorico[leadId] !== undefined) return; // já carregado
    setLeadHistLoading(prev => ({ ...prev, [leadId]: true }));
    try {
      const hist = await getHistoricoEtapaLead(leadId);
      setLeadHistorico(prev => ({ ...prev, [leadId]: hist }));
    } catch {
      setLeadHistorico(prev => ({ ...prev, [leadId]: [] }));
    } finally {
      setLeadHistLoading(prev => ({ ...prev, [leadId]: false }));
    }
  }

  async function handleDeletarHistoricoTodo(leadId: string) {
    if (!confirm('Apagar todo o histórico de etapas deste lead?')) return;
    setDeletandoHistorico(leadId);
    try {
      await deleteHistoricoEtapaLead(leadId);
      setLeadHistorico(prev => ({ ...prev, [leadId]: [] }));
    } catch {
      alert('Erro ao apagar histórico.');
    } finally {
      setDeletandoHistorico(null);
    }
  }

  async function handleDeletarHistoricoItem(leadId: string, itemId: string) {
    setDeletandoHistorico(itemId);
    try {
      await deleteHistoricoEtapaItem(itemId);
      setLeadHistorico(prev => ({
        ...prev,
        [leadId]: (prev[leadId] ?? []).filter(h => h.id !== itemId),
      }));
    } catch {
      alert('Erro ao apagar entrada do histórico.');
    } finally {
      setDeletandoHistorico(null);
    }
  }

  useEffect(() => {
    if (!selectedCliente) return;
    setCliDetalheTab('dados');
    setCliHist({ pedidos: [], assinaturas: [], reservas: [], loading: true });
    setLeadHistorico({});
    setLeadHistLoading({});

    Promise.allSettled([
      getPedidos(selectedCliente.id),
      getAssinaturasCliente(selectedCliente.id),
      getReservasCliente(selectedCliente.id),
    ]).then(([rPedidos, rAss, rRes]) => {
      if (rPedidos.status  === 'rejected') console.error('[CRM] getPedidos error:', rPedidos.reason);
      if (rAss.status      === 'rejected') console.error('[CRM] getAssinaturasCliente error:', rAss.reason);
      if (rRes.status      === 'rejected') console.error('[CRM] getReservasCliente error:', rRes.reason);
      setCliHist({
        pedidos:     rPedidos.status === 'fulfilled' ? rPedidos.value : [],
        assinaturas: rAss.status     === 'fulfilled' ? rAss.value     : [],
        reservas:    rRes.status     === 'fulfilled' ? rRes.value     : [],
        loading: false,
      });
    });
  }, [selectedCliente?.id]);

  useEffect(() => {
    getLeads().then(setLeads).catch(console.error);
    getClientes().then(setClientes).catch(console.error);
    getPlanos().then(list => {
      const map: Record<string, string> = {};
      list.forEach(p => { map[p.id] = p.nome; });
      setPlanosMap(map);
    }).catch(() => {});
  }, []);

  // Carrega follow-ups quando a aba for selecionada
  useEffect(() => {
    if (tab !== 'followup') return;
    setLoadingFollowUps(true);
    getFollowUps().then(setFollowUps).catch(console.error).finally(() => setLoadingFollowUps(false));
  }, [tab]);

  // ── Filtros leads ──────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    const matchSearch = search === ''
      || l.nome.toLowerCase().includes(search.toLowerCase())
      || l.email.toLowerCase().includes(search.toLowerCase());
    const matchFiltros = filtrosLead.every(f => matchLeadFiltro(l, f));
    return matchSearch && matchFiltros;
  });
  const leadsPorEtapa = (etapa: LeadEtapa) => filteredLeads.filter(l => l.etapa === etapa);

  // Leads vinculados ao cliente selecionado (derivado fora do modal)
  const clienteLeadsAtual = selectedCliente
    ? leads.filter(l => l.clienteId === selectedCliente.id || l.email === selectedCliente.email)
    : [];

  // ── Preferências do funil: load/save localStorage ─────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`dsmatas_funil_cols_${user.id}`);
      if (!raw) return;
      const prefs = JSON.parse(raw) as { ordem: LeadEtapa[]; visiveis: LeadEtapa[] };
      const validIds = new Set(etapas.map(e => e.id));
      const ordemValida = prefs.ordem.filter(id => validIds.has(id));
      // garante que etapas novas não salvas ainda apareçam no fim
      for (const id of FUNIL_DEFAULT_ORDEM) {
        if (!ordemValida.includes(id)) ordemValida.push(id);
      }
      setFunilOrdem(ordemValida);
      setFunilVisiveis(new Set(prefs.visiveis.filter(id => validIds.has(id))));
    } catch { /* usa defaults */ }
  }, [user?.id]);

  function saveFunilPrefs(ordem: LeadEtapa[], visiveis: Set<LeadEtapa>) {
    if (!user?.id) return;
    localStorage.setItem(
      `dsmatas_funil_cols_${user.id}`,
      JSON.stringify({ ordem, visiveis: [...visiveis] }),
    );
  }

  // colunas visíveis na ordem salva
  const etapasFunilAtivas = funilOrdem
    .filter(id => funilVisiveis.has(id))
    .map(id => etapas.find(e => e.id === id))
    .filter((e): e is typeof etapas[0] => !!e);

  // ── Handlers funil: config panel ──────────────────────────────────────────
  function toggleFunilVisivel(id: LeadEtapa) {
    const next = new Set(funilVisiveis);
    next.has(id) ? next.delete(id) : next.add(id);
    setFunilVisiveis(next);
    saveFunilPrefs(funilOrdem, next);
  }

  function resetFunilPrefs() {
    setFunilOrdem(FUNIL_DEFAULT_ORDEM);
    const next = new Set<LeadEtapa>(FUNIL_DEFAULT_ORDEM);
    setFunilVisiveis(next);
    saveFunilPrefs(FUNIL_DEFAULT_ORDEM, next);
  }

  // drag no painel de configuração (reordena a lista)
  function handleCfgDragOver(e: React.DragEvent, id: LeadEtapa) {
    e.preventDefault();
    if (!dragCfgSrc || dragCfgSrc === id) return;
    const next = [...funilOrdem];
    const from = next.indexOf(dragCfgSrc);
    const to   = next.indexOf(id);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragCfgSrc);
    setFunilOrdem(next);
  }

  function handleCfgDrop() {
    saveFunilPrefs(funilOrdem, funilVisiveis);
    setDragCfgSrc(null);
  }

  // drag direto nas colunas do funil
  function handleColDragOver(e: React.DragEvent, id: LeadEtapa) {
    e.preventDefault();
    if (dragColSrc && dragColSrc !== id) setDragColOver(id);
  }

  function handleColDrop(id: LeadEtapa) {
    if (!dragColSrc || dragColSrc === id) { setDragColSrc(null); setDragColOver(null); return; }
    const next = [...funilOrdem];
    const from = next.indexOf(dragColSrc);
    const to   = next.indexOf(id);
    if (from !== -1 && to !== -1) {
      next.splice(from, 1);
      next.splice(to, 0, dragColSrc);
      setFunilOrdem(next);
      saveFunilPrefs(next, funilVisiveis);
    }
    setDragColSrc(null);
    setDragColOver(null);
  }

  // ── Atualizar etapa do lead ────────────────────────────────────────────────
  async function handleAtualizarEtapaLead(leadId: string, novaEtapa: LeadEtapa) {
    setAtualizandoEtapa(leadId);
    try {
      await updateLeadEtapa(leadId, novaEtapa, user?.name ?? 'admin');
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa: novaEtapa } : l));
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, etapa: novaEtapa } : prev);
        setLeadHistorico(prev => { const next = { ...prev }; delete next[leadId]; return next; });
        carregarHistoricoLead(leadId);
      }
    } catch {
      alert('Erro ao atualizar etapa.');
    } finally {
      setAtualizandoEtapa(null);
    }
  }

  // drag de cards entre colunas
  function handleCardDrop(etapaId: LeadEtapa) {
    if (!dragCardLeadId) return;
    const lead = leads.find(l => l.id === dragCardLeadId);
    if (lead && lead.etapa !== etapaId) handleAtualizarEtapaLead(dragCardLeadId, etapaId);
    setDragCardLeadId(null);
    setDragCardOver(null);
  }

  // ── Salvar nova interação ─────────────────────────────────────────────────
  async function handleSalvarInteracao() {
    if (!selectedLead || !formInter.descricao.trim()) return;
    setSalvandoInter(true);
    try {
      await addInteracao(selectedLead.id, formInter.tipo, formInter.descricao.trim(), user?.name ?? 'admin');
      // Recarrega o lead para exibir a nova interação
      const { getLeads: gl } = await import('../../services/leads.service');
      const updated = await gl();
      setLeads(updated);
      const novo = updated.find(l => l.id === selectedLead.id);
      if (novo) setSelectedLead(novo);
      setNovaInteracaoModal(false);
      setFormInter({ tipo: 'email', descricao: '' });
    } catch {
      alert('Erro ao salvar interação.');
    } finally {
      setSalvandoInter(false);
    }
  }

  // ── Bulk selection handlers ────────────────────────────────────────────────
  function toggleSelectLead(id: string) {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedLeads.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  }

  async function handleBulkEdit() {
    if (selectedLeads.size === 0) return;
    setBulkEditando(true);
    try {
      const patch: Parameters<typeof updateLead>[1] = {};
      if (bulkEditField === 'etapa')             patch.etapa = bulkEditValue as LeadEtapa;
      else if (bulkEditField === 'responsavel')  patch.responsavel = bulkEditValue;
      else if (bulkEditField === 'proximoFollowUp') patch.proximoFollowUp = bulkEditValue || undefined;
      else if (bulkEditField === 'observacoes')  patch.observacoes = bulkEditValue;
      else if (bulkEditField === 'tags')         patch.tags = bulkEditValue.split(',').map(t => t.trim()).filter(Boolean);
      await Promise.all([...selectedLeads].map(id => updateLead(id, patch)));
      setLeads(prev => prev.map(l => selectedLeads.has(l.id) ? { ...l, ...patch } : l));
      setBulkEditModal(false);
      setBulkEditValue('');
      setSelectedLeads(new Set());
    } catch {
      alert('Erro ao aplicar edição em massa.');
    } finally {
      setBulkEditando(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedLeads.size === 0) return;
    if (!confirm(`Excluir ${selectedLeads.size} lead(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    try {
      const { deleteLead } = await import('../../services/leads.service');
      await Promise.all([...selectedLeads].map(id => deleteLead(id)));
      setLeads(prev => prev.filter(l => !selectedLeads.has(l.id)));
      setSelectedLeads(new Set());
    } catch {
      alert('Erro ao excluir leads.');
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportLeads(format: 'csv' | 'json' | 'pdf') {
    const data = selectedLeads.size > 0
      ? filteredLeads.filter(l => selectedLeads.has(l.id))
      : filteredLeads;

    if (format === 'csv') {
      const BOM = '\uFEFF';
      const header = 'Nome,E-mail,Telefone,Origem,Etapa,Plano,Follow-up,Tags,Observações';
      const rows = data.map(l => [
        `"${(l.nome ?? '').replace(/"/g, '""')}"`,
        `"${(l.email ?? '').replace(/"/g, '""')}"`,
        `"${(l.telefone ?? '')}"`,
        `"${l.origem}"`,
        `"${etapas.find(e => e.id === l.etapa)?.label ?? l.etapa}"`,
        `"${l.planoDesejado ?? ''}"`,
        `"${l.proximoFollowUp ? new Date(l.proximoFollowUp).toLocaleDateString('pt-BR') : ''}"`,
        `"${(l.tags ?? []).join('; ')}"`,
        `"${(l.observacoes ?? '').replace(/"/g, '""')}"`,
      ].join(','));
      const csv = BOM + [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'leads.json'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Leads — Das Matas</title>
        <style>body{font-family:sans-serif;font-size:11px;color:#333;padding:20px}
        h1{font-size:16px;margin-bottom:4px}p{color:#888;margin:0 0 12px;font-size:10px}
        table{width:100%;border-collapse:collapse}
        th{background:#f5f0e8;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#666;border-bottom:2px solid #e0d8c8}
        td{padding:5px 8px;border-bottom:1px solid #f0ebe0;font-size:11px}
        tr:nth-child(even) td{background:#faf8f4}
        @media print{body{padding:0}}</style>
      </head><body>
        <h1>Lista de Leads — Das Matas</h1>
        <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${data.length} lead(s)</p>
        <table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Origem</th><th>Etapa</th><th>Plano</th><th>Follow-up</th><th>Tags</th></tr></thead>
        <tbody>${data.map(l => `<tr>
          <td>${l.nome}</td><td>${l.email}</td><td>${l.telefone ?? ''}</td><td>${l.origem}</td>
          <td>${etapas.find(e => e.id === l.etapa)?.label ?? l.etapa}</td>
          <td>${l.planoDesejado ?? ''}</td>
          <td>${l.proximoFollowUp ? new Date(l.proximoFollowUp).toLocaleDateString('pt-BR') : ''}</td>
          <td>${(l.tags ?? []).join(', ')}</td>
        </tr>`).join('')}</tbody></table>
      </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 400);
    }
    setExportDropdown(false);
  }

  // ── Import CSV ─────────────────────────────────────────────────────────────
  function parseImportCSV(text: string) {
    // Strip BOM if present
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.trim().split(/\r?\n/);
    // Detect header row
    const firstLow = lines[0].toLowerCase();
    const hasHeader = firstLow.includes('nome') || firstLow.includes('email') || firstLow.includes('telefone');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const origensValidas = new Set(['manual', 'checkout', 'reserva', 'blog', 'social', 'indicacao', 'landing']);
    const etapasValidas  = new Set(etapas.map(e => e.id));

    return dataLines.map(line => {
      const parts: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if ((ch === ',' || ch === ';') && !inQ) { parts.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      parts.push(cur.trim());
      const origem = (parts[3] ?? '').toLowerCase().trim();
      const etapa  = (parts[4] ?? '').toLowerCase().trim();
      return {
        nome:     parts[0] ?? '',
        telefone: parts[1] ?? '',
        email:    parts[2] ?? '',
        origem:   origensValidas.has(origem) ? origem : 'manual',
        etapa:    etapasValidas.has(etapa as LeadEtapa) ? etapa as LeadEtapa : 'novo' as LeadEtapa,
      };
    }).filter(r => r.nome.trim() && r.email.trim());
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setImportPreview(parseImportCSV(text));
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleConfirmImport() {
    if (importPreview.length === 0) return;
    setImportando(true);
    let ok = 0, erros = 0;
    for (const row of importPreview) {
      try {
        await createLead({
          nome:     row.nome,
          email:    row.email,
          telefone: row.telefone || undefined,
          origem:   (row.origem as Lead['origem']) || 'manual',
          etapa:    row.etapa || 'novo',
        });
        ok++;
      } catch { erros++; }
    }
    const updated = await getLeads();
    setLeads(updated);
    setImportModal(false);
    setImportPreview([]);
    if (erros > 0) alert(`${ok} lead(s) importados. ${erros} erro(s).`);
    setImportando(false);
  }

  // ── Clientes bulk handlers ─────────────────────────────────────────────────
  function toggleSelectCli(id: string) {
    setSelectedClis(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleSelectAllCli() {
    if (selectedClis.size === paginatedCli.length && paginatedCli.length > 0) {
      setSelectedClis(new Set());
    } else {
      setSelectedClis(new Set(paginatedCli.map(c => c.id)));
    }
  }

  function selectAllFilteredCli() {
    setSelectedClis(new Set(filteredCli.map(c => c.id)));
  }

  async function handleBulkEditCli() {
    if (selectedClis.size === 0) return;
    setBulkCliando(true);
    try {
      const prefCafe = bulkCliField === 'preferenciaCafe' ? bulkCliValue as 'grao' | 'moido' : undefined;
      const moagem   = bulkCliField === 'tipoMoagem' ? bulkCliValue : undefined;

      await Promise.all([...selectedClis].map(id => {
        const cli = clientes.find(c => c.id === id);
        if (!cli) return Promise.resolve();
        if (prefCafe) return updateClientePreferencias(id, prefCafe, moagem);
        if (moagem)   return updateClientePreferencias(id, cli.preferenciaCafe, moagem);
        return Promise.resolve();
      }));

      setClientes(prev => prev.map(c => {
        if (!selectedClis.has(c.id)) return c;
        if (bulkCliField === 'preferenciaCafe') return { ...c, preferenciaCafe: bulkCliValue as 'grao' | 'moido', tipoMoagem: bulkCliValue === 'grao' ? undefined : c.tipoMoagem };
        if (bulkCliField === 'tipoMoagem')      return { ...c, tipoMoagem: bulkCliValue as 'fino' | 'medio' | 'grosso' | 'extraGrosso' };
        return c;
      }));
      setBulkCliModal(false);
      setBulkCliValue('');
      setSelectedClis(new Set());
    } catch {
      alert('Erro ao aplicar edição em massa.');
    } finally {
      setBulkCliando(false);
    }
  }

  // ── Helpers filtros lead ───────────────────────────────────────────────────
  function adicionarFiltroLead() {
    setFiltrosLead(prev => [...prev, { id: crypto.randomUUID(), campo: 'nome', operador: 'contem', valor: '' }]);
    setMostrarFiltrosLead(true);
  }
  function atualizarFiltroLead(id: string, patch: Partial<FiltroLead>) {
    setFiltrosLead(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }
  function toggleColunaLead(id: string) {
    setColunasLeadVis(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleColunaFunilCard(id: string) {
    setColunasFunilCard(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // fechar config panel ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (funilConfigRef.current && !funilConfigRef.current.contains(e.target as Node)) setShowFunilConfig(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportDropdown(false);
      if (colunasLeadRef.current && !colunasLeadRef.current.contains(e.target as Node)) setMostrarColunasLead(false);
      if (colunasFunilRef.current && !colunasFunilRef.current.contains(e.target as Node)) setMostrarColunasFunil(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Carrega histórico de etapas quando aba funil é aberta (modal de cliente)
  useEffect(() => {
    if (cliDetalheTab !== 'funil' || clienteLeadsAtual.length === 0) return;
    clienteLeadsAtual.forEach(l => carregarHistoricoLead(l.id));
  }, [cliDetalheTab, selectedCliente?.id]);

  // Carrega histórico de etapas quando modal de lead é aberto
  useEffect(() => {
    if (!selectedLead) return;
    // Força recarregamento sempre que abre o modal
    setLeadHistorico(prev => {
      const next = { ...prev };
      delete next[selectedLead.id];
      return next;
    });
    carregarHistoricoLead(selectedLead.id);
  }, [selectedLead?.id]);

  // ── Filtros clientes ───────────────────────────────────────────────────────
  const filteredCli = clientes.filter(c => {
    const termo = clienteSearch.toLowerCase();
    const matchSearch = clienteSearch === ''
      || c.name.toLowerCase().includes(termo)
      || c.email.toLowerCase().includes(termo)
      || c.phone.toLowerCase().includes(termo)
      || (c.cpf ?? '').includes(termo);
    const matchDinamico = filtrosCli.every(f => matchCliFiltro(c, f));
    return matchSearch && matchDinamico;
  });
  const paginatedCli = filteredCli.slice((clientePage - 1) * perPageCli, clientePage * perPageCli);

  function toggleColunaCli(id: string) {
    setColunasVis(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function adicionarFiltroCli() {
    setFiltrosCli(prev => [...prev, { id: crypto.randomUUID(), campo: 'name', operador: 'contem', valor: '' }]);
    setMostrarFiltrosCli(true);
  }
  function atualizarFiltroCli(id: string, patch: Partial<FiltroCliente>) {
    setFiltrosCli(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function abrirEditarCliente(c: Cliente) {
    setFormCli({
      name: c.name, phone: c.phone, cpf: c.cpf ?? '',
      birthdate: c.birthdate ?? '', preferenciaCafe: c.preferenciaCafe,
      tipoMoagem: c.tipoMoagem ?? '',
    });
    setEditandoCli(true);
  }

  async function handleSalvarCliente() {
    if (!selectedCliente) return;
    setSalvandoCli(true);
    try {
      await updateCliente(selectedCliente.id, selectedCliente.userId, {
        name:           formCli.name,
        phone:          formCli.phone,
        cpf:            formCli.cpf,
        birthdate:      formCli.birthdate || undefined,
        preferenciaCafe: formCli.preferenciaCafe,
        tipoMoagem:     formCli.preferenciaCafe === 'moido' ? formCli.tipoMoagem : undefined,
      });
      // Atualizar localmente
      const updated: Cliente = {
        ...selectedCliente,
        name: formCli.name, phone: formCli.phone, cpf: formCli.cpf || undefined,
        birthdate: formCli.birthdate || undefined, preferenciaCafe: formCli.preferenciaCafe,
        tipoMoagem: formCli.preferenciaCafe === 'moido' ? (formCli.tipoMoagem || undefined) as 'fino' | 'medio' | 'grosso' | 'extraGrosso' | undefined : undefined,
      };
      setClientes(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedCliente(updated);
      setEditandoCli(false);
    } catch {
      alert('Erro ao salvar cadastro.');
    } finally {
      setSalvandoCli(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="CRM / Leads"
        subtitle={`${leads.length} leads cadastrados`}
        action={
          <Button variant="primary" size="sm" onClick={() => setNovoModal(true)}>
            <Plus size={14} /> Novo lead
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: 'funil',    label: 'Funil Visual' },
          { id: 'lista',    label: 'Lista de Leads', count: leads.length },
          { id: 'clientes', label: 'Clientes',        count: clientes.length },
          { id: 'followup', label: 'Follow-ups',      count: followUps.filter(l => l.proximoFollowUp && new Date(l.proximoFollowUp) <= new Date()).length || undefined },
        ]}
        active={tab}
        onChange={(t: string) => {
          const routes: Record<string, string> = {
            funil: '/admin/crm',
            lista: '/admin/crm/leads',
            clientes: '/admin/crm/clientes',
            followup: '/admin/crm/followup',
          };
          navigate(routes[t] ?? '/admin/crm');
        }}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar leads..." className="max-w-md" />

      {/* ── FUNIL ─────────────────────────────────────────────────────────── */}
      {tab === 'funil' && (
        <div className="space-y-3">

          {/* Toolbar: filtros + colunas etapas + campos do card */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros de lead */}
            <button
              onClick={() => setMostrarFiltrosLead(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm border transition-colors ${mostrarFiltrosLead || filtrosLead.length > 0 ? 'bg-forest-50 border-forest-300 text-forest-700' : 'bg-white text-charcoal-600 border-cream-300 hover:border-forest-300'}`}
            >
              <SlidersHorizontal size={14} /> Filtros
              {filtrosLead.length > 0 && (
                <span className="ml-0.5 bg-forest-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{filtrosLead.length}</span>
              )}
              <ChevronDown size={12} className={`transition-transform ${mostrarFiltrosLead ? 'rotate-180' : ''}`} />
            </button>

            {/* Campos do card */}
            <div className="relative" ref={colunasFunilRef}>
              <button
                onClick={() => setMostrarColunasFunil(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm border transition-colors ${mostrarColunasFunil ? 'bg-forest-50 border-forest-300 text-forest-700' : 'bg-white text-charcoal-600 border-cream-300 hover:border-forest-300'}`}
              >
                <Columns2 size={14} /> Campos do card
                <ChevronDown size={12} className={`transition-transform ${mostrarColunasFunil ? 'rotate-180' : ''}`} />
              </button>
              {mostrarColunasFunil && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-cream-200 rounded-sm shadow-lg p-3 w-48 space-y-1">
                  {COLUNAS_FUNIL_CARD.map(col => (
                    <label key={col.id} className="flex items-center gap-2 text-sm text-charcoal-600 cursor-pointer hover:text-charcoal-800 py-0.5">
                      <input type="checkbox" checked={colunasFunilCard.has(col.id)} onChange={() => toggleColunaFunilCard(col.id)} className="w-3.5 h-3.5 accent-forest-500" />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Etapa-colunas */}
            <div className="relative" ref={funilConfigRef}>
              <button
                onClick={() => setShowFunilConfig(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-sm border transition-colors ${
                  showFunilConfig
                    ? 'bg-forest-500 text-white border-forest-600'
                    : 'bg-white text-charcoal-600 border-cream-300 hover:border-earth-300'
                }`}
              >
                <Settings2 size={14} />
                Colunas
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${showFunilConfig ? 'bg-white/20' : 'bg-cream-200 text-charcoal-500'}`}>
                  {etapasFunilAtivas.length}
                </span>
              </button>

              {/* Painel de configuração */}
              {showFunilConfig && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white rounded-sm border border-cream-200 shadow-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-cream-100">
                    <span className="text-sm font-medium text-charcoal-700">Gerenciar colunas</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={resetFunilPrefs}
                        className="flex items-center gap-1 text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors"
                        title="Restaurar padrão"
                      >
                        <RotateCcw size={12} /> Padrão
                      </button>
                      <button onClick={() => setShowFunilConfig(false)} className="text-charcoal-400 hover:text-charcoal-600">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="py-1 max-h-80 overflow-y-auto">
                    {funilOrdem.map(id => {
                      const et = etapas.find(e => e.id === id);
                      if (!et) return null;
                      const visivel = funilVisiveis.has(id);
                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={e => { setDragCfgSrc(id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={e => handleCfgDragOver(e, id)}
                          onDrop={handleCfgDrop}
                          onDragEnd={() => setDragCfgSrc(null)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-grab hover:bg-cream-50 transition-colors ${
                            dragCfgSrc === id ? 'opacity-40' : ''
                          }`}
                        >
                          <GripVertical size={14} className="text-charcoal-300 shrink-0" />
                          <input
                            type="checkbox"
                            checked={visivel}
                            onChange={() => toggleFunilVisivel(id)}
                            className="accent-forest-500 w-4 h-4 shrink-0"
                          />
                          <span className={`flex-1 text-xs px-2 py-0.5 rounded border font-medium ${et.color}`}>
                            {et.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 border-t border-cream-100 text-[10px] text-charcoal-400">
                    Arraste para reordenar · Checkbox para mostrar/ocultar
                  </div>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-charcoal-400">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
              {filtrosLead.length > 0 && (
                <button onClick={() => setFiltrosLead([])} className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2">Limpar filtros</button>
              )}
            </div>
          </div>

          {/* Painel de filtros */}
          {mostrarFiltrosLead && (
            <div className="px-4 py-3 bg-cream-50 border border-cream-200 rounded-sm space-y-2">
              {filtrosLead.length === 0 && <p className="text-sm text-charcoal-400">Nenhum filtro ativo.</p>}
              {filtrosLead.map(f => {
                const tipo = CAMPOS_LEAD.find(c => c.value === f.campo)?.tipo ?? 'texto';
                const ops  = OPERADORES_LEAD[tipo] ?? OPERADORES_LEAD.texto;
                const semValor = f.operador === 'tem' || f.operador === 'nao_tem';
                return (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    <select value={f.campo} onChange={e => atualizarFiltroLead(f.id, { campo: e.target.value, operador: (OPERADORES_LEAD[CAMPOS_LEAD.find(c=>c.value===e.target.value)?.tipo??'texto']??OPERADORES_LEAD.texto)[0].value, valor: '' })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                      {CAMPOS_LEAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={f.operador} onChange={e => atualizarFiltroLead(f.id, { operador: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                      {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {!semValor && (
                      tipo === 'origem' ? (
                        <select value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                          <option value="">Selecione…</option>
                          {['manual','checkout','reserva','blog','social','indicacao','landing'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : tipo === 'etapa' ? (
                        <select value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                          <option value="">Selecione…</option>
                          {etapas.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                      ) : tipo === 'data' ? (
                        <input type="date" value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                      ) : (
                        <input type="text" value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} placeholder="Valor…" className="w-44 px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                      )
                    )}
                    <button onClick={() => setFiltrosLead(prev => prev.filter(x => x.id !== f.id))} className="p-1 text-charcoal-400 hover:text-red-500 rounded-sm transition-colors"><X size={14} /></button>
                  </div>
                );
              })}
              <button onClick={adicionarFiltroLead} className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium mt-1">
                <Plus size={13} /> Adicionar filtro
              </button>
            </div>
          )}

          {/* Colunas do funil */}
          <div
            ref={kanbanRef}
            className="overflow-x-auto pb-4 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={e => {
              if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
              const el = kanbanRef.current!;
              kanbanDrag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
            }}
            onMouseMove={e => {
              if (!kanbanDrag.current.active) return;
              e.preventDefault();
              const el = kanbanRef.current!;
              el.scrollLeft = kanbanDrag.current.scrollLeft - (e.pageX - el.offsetLeft - kanbanDrag.current.startX);
            }}
            onMouseUp={() => { kanbanDrag.current.active = false; }}
            onMouseLeave={() => { kanbanDrag.current.active = false; }}
          >
            <div className="flex gap-4 min-w-max">
              {etapasFunilAtivas.map(etapa => {
                const etapaLeads   = leadsPorEtapa(etapa.id);
                const isColDragOver  = dragColOver  === etapa.id;
                const isCardDragOver = dragCardOver === etapa.id;
                const isDragging     = dragColSrc   === etapa.id;
                return (
                  <div
                    key={etapa.id}
                    className={`w-64 shrink-0 transition-opacity ${isDragging ? 'opacity-40' : ''}`}
                    onDragOver={e => {
                      e.preventDefault();
                      if (dragCardLeadId) setDragCardOver(etapa.id);
                      else handleColDragOver(e, etapa.id);
                    }}
                    onDrop={() => {
                      if (dragCardLeadId) handleCardDrop(etapa.id);
                      else handleColDrop(etapa.id);
                    }}
                    onDragLeave={() => { setDragColOver(null); setDragCardOver(null); }}
                  >
                    {/* Cabeçalho da coluna — arrastável */}
                    <div
                      draggable
                      onDragStart={e => { setDragColSrc(etapa.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setDragColSrc(null); setDragColOver(null); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-sm border mb-3 cursor-grab select-none transition-all ${etapa.color} ${
                        isColDragOver ? 'ring-2 ring-forest-400 ring-offset-1' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={12} className="opacity-50" />
                        <span className="text-xs font-medium">{etapa.label}</span>
                      </div>
                      <span className="text-xs font-bold">{etapaLeads.length}</span>
                    </div>

                    <div className={`space-y-3 min-h-24 rounded-sm transition-colors ${isCardDragOver ? 'bg-forest-50 ring-2 ring-forest-300 ring-offset-1' : ''}`}>
                      {etapaLeads.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => setSelectedLead(lead)}
                          onDragStart={() => { setDragCardLeadId(lead.id); }}
                          onDragEnd={() => { setDragCardLeadId(null); setDragCardOver(null); }}
                          colunasVis={colunasFunilCard}
                          nomePlano={nomePlano}
                        />
                      ))}
                      {etapaLeads.length === 0 && (
                        <div className={`flex items-center justify-center h-16 border-2 border-dashed rounded-sm text-xs transition-colors ${
                          isCardDragOver ? 'border-forest-400 bg-forest-50 text-forest-600' : 'border-cream-300 text-charcoal-300'
                        }`}>
                          {isCardDragOver ? 'Soltar aqui' : 'Nenhum lead'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA DE LEADS ────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <Card padding={false}>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-cream-100">
            {/* Bulk action bar (visible when rows selected) */}
            {selectedLeads.size > 0 ? (
              <>
                <span className="text-sm font-medium text-charcoal-600">
                  <SquareCheck size={14} className="inline mr-1.5 text-forest-500" />
                  {selectedLeads.size} selecionado{selectedLeads.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setSelectedLeads(new Set(filteredLeads.map(l => l.id)))}
                  className="text-xs text-forest-600 hover:text-forest-700 underline underline-offset-2"
                >
                  Selecionar todos ({filteredLeads.length})
                </button>
                <button
                  onClick={() => setSelectedLeads(new Set())}
                  className="text-xs text-charcoal-400 hover:text-charcoal-600 underline underline-offset-2"
                >
                  Desmarcar
                </button>
                <div className="h-4 w-px bg-cream-300" />
                <button
                  onClick={() => { setBulkEditField('etapa'); setBulkEditValue(''); setBulkEditModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-forest-500 text-white rounded-sm hover:bg-forest-600 transition-colors"
                >
                  <Pencil size={13} /> Editar em massa
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-sm hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </>
            ) : (
              <span className="text-xs text-charcoal-400">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Import button */}
              <button
                onClick={() => { setImportPreview([]); setImportModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-cream-200 text-charcoal-600 rounded-sm hover:border-forest-300 hover:text-forest-600 transition-colors"
              >
                <Upload size={13} /> Importar
              </button>

              {/* Export dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-cream-200 text-charcoal-600 rounded-sm hover:border-forest-300 hover:text-forest-600 transition-colors"
                >
                  <Download size={13} />
                  Exportar
                  {selectedLeads.size > 0 && <span className="ml-1 px-1.5 py-0 bg-forest-100 text-forest-700 text-xs rounded-full">{selectedLeads.size}</span>}
                  <ChevronDown size={11} className={`transition-transform ${exportDropdown ? 'rotate-180' : ''}`} />
                </button>
                {exportDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-cream-200 rounded-sm shadow-lg py-1 w-44">
                    <p className="px-3 py-1.5 text-[10px] font-medium text-charcoal-400 uppercase tracking-wider border-b border-cream-100">
                      {selectedLeads.size > 0 ? `${selectedLeads.size} selecionado(s)` : 'Todos os leads'}
                    </p>
                    <button onClick={() => exportLeads('csv')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-charcoal-600 hover:bg-cream-50 transition-colors">
                      <FileDown size={13} className="text-green-600" /> Excel / CSV
                    </button>
                    <button onClick={() => exportLeads('json')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-charcoal-600 hover:bg-cream-50 transition-colors">
                      <FileDown size={13} className="text-blue-600" /> JSON
                    </button>
                    <button onClick={() => exportLeads('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-charcoal-600 hover:bg-cream-50 transition-colors">
                      <FileDown size={13} className="text-red-500" /> PDF / Imprimir
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filtros + colunas (second toolbar row) */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-cream-100 bg-cream-50/50">
            <button
              onClick={() => setMostrarFiltrosLead(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors ${mostrarFiltrosLead || filtrosLead.length > 0 ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-cream-200 text-charcoal-500 hover:border-forest-300 hover:text-forest-600'}`}
            >
              <SlidersHorizontal size={13} /> Filtros
              {filtrosLead.length > 0 && <span className="ml-0.5 bg-forest-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{filtrosLead.length}</span>}
              <ChevronDown size={11} className={`transition-transform ${mostrarFiltrosLead ? 'rotate-180' : ''}`} />
            </button>

            <div className="relative" ref={colunasLeadRef}>
              <button
                onClick={() => setMostrarColunasLead(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors ${mostrarColunasLead ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-cream-200 text-charcoal-500 hover:border-forest-300 hover:text-forest-600'}`}
              >
                <Columns2 size={13} /> Colunas
                <ChevronDown size={11} className={`transition-transform ${mostrarColunasLead ? 'rotate-180' : ''}`} />
              </button>
              {mostrarColunasLead && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-cream-200 rounded-sm shadow-lg p-3 w-48 space-y-1">
                  {COLUNAS_LEAD.map(col => (
                    <label key={col.id} className="flex items-center gap-2 text-sm text-charcoal-600 cursor-pointer hover:text-charcoal-800 py-0.5">
                      <input type="checkbox" checked={colunasLeadVis.has(col.id)} onChange={() => toggleColunaLead(col.id)} className="w-3.5 h-3.5 accent-forest-500" />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {filtrosLead.length > 0 && (
              <button onClick={() => setFiltrosLead([])} className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2">Limpar filtros</button>
            )}
          </div>

          {/* Painel de filtros */}
          {mostrarFiltrosLead && (
            <div className="px-4 py-3 bg-cream-50 border-b border-cream-100 space-y-2">
              {filtrosLead.length === 0 && <p className="text-sm text-charcoal-400">Nenhum filtro ativo.</p>}
              {filtrosLead.map(f => {
                const tipo = CAMPOS_LEAD.find(c => c.value === f.campo)?.tipo ?? 'texto';
                const ops  = OPERADORES_LEAD[tipo] ?? OPERADORES_LEAD.texto;
                const semValor = f.operador === 'tem' || f.operador === 'nao_tem';
                return (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    <select value={f.campo} onChange={e => atualizarFiltroLead(f.id, { campo: e.target.value, operador: (OPERADORES_LEAD[CAMPOS_LEAD.find(c=>c.value===e.target.value)?.tipo??'texto']??OPERADORES_LEAD.texto)[0].value, valor: '' })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                      {CAMPOS_LEAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={f.operador} onChange={e => atualizarFiltroLead(f.id, { operador: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                      {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {!semValor && (
                      tipo === 'origem' ? (
                        <select value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                          <option value="">Selecione…</option>
                          {['manual','checkout','reserva','blog','social','indicacao','landing'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : tipo === 'etapa' ? (
                        <select value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                          <option value="">Selecione…</option>
                          {etapas.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                      ) : tipo === 'data' ? (
                        <input type="date" value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                      ) : (
                        <input type="text" value={f.valor} onChange={e => atualizarFiltroLead(f.id, { valor: e.target.value })} placeholder="Valor…" className="w-44 px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                      )
                    )}
                    <button onClick={() => setFiltrosLead(prev => prev.filter(x => x.id !== f.id))} className="p-1 text-charcoal-400 hover:text-red-500 rounded-sm transition-colors"><X size={14} /></button>
                  </div>
                );
              })}
              <button onClick={adicionarFiltroLead} className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium mt-1">
                <Plus size={13} /> Adicionar filtro
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th w-10">
                    <input type="checkbox" checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 accent-forest-500 cursor-pointer" />
                  </th>
                  {colunasLeadVis.has('nome')        && <th className="table-th">Nome</th>}
                  {colunasLeadVis.has('contato')     && <th className="table-th">Contato</th>}
                  {colunasLeadVis.has('origem')      && <th className="table-th">Origem</th>}
                  {colunasLeadVis.has('etapa')       && <th className="table-th">Etapa</th>}
                  {colunasLeadVis.has('plano')       && <th className="table-th">Plano</th>}
                  {colunasLeadVis.has('followup')    && <th className="table-th">Follow-up</th>}
                  {colunasLeadVis.has('tags')        && <th className="table-th">Tags</th>}
                  {colunasLeadVis.has('responsavel') && <th className="table-th">Responsável</th>}
                  {colunasLeadVis.has('observacoes') && <th className="table-th">Observações</th>}
                  {colunasLeadVis.has('criado')      && <th className="table-th">Entrada</th>}
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const etapa = etapas.find(e => e.id === lead.etapa);
                  const isSelected = selectedLeads.has(lead.id);
                  return (
                    <tr key={lead.id} className={`border-t border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors ${isSelected ? 'bg-forest-50' : ''}`} onClick={() => setSelectedLead(lead)}>
                      <td className="table-td w-10" onClick={e => { e.stopPropagation(); toggleSelectLead(lead.id); }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelectLead(lead.id)} className="w-3.5 h-3.5 accent-forest-500 cursor-pointer" />
                      </td>
                      {colunasLeadVis.has('nome')        && <td className="table-td font-medium text-charcoal-700">{lead.nome}</td>}
                      {colunasLeadVis.has('contato')     && (
                        <td className="table-td">
                          <p className="text-sm text-charcoal-600">{lead.email}</p>
                          <p className="text-xs text-charcoal-400">{lead.telefone}</p>
                        </td>
                      )}
                      {colunasLeadVis.has('origem')      && <td className="table-td text-charcoal-500 capitalize">{lead.origem}</td>}
                      {colunasLeadVis.has('etapa')       && (
                        <td className="table-td">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${etapa?.color}`}>{etapa?.label}</span>
                        </td>
                      )}
                      {colunasLeadVis.has('plano')       && <td className="table-td text-charcoal-500 text-sm">{nomePlano(lead.planoDesejado) || '—'}</td>}
                      {colunasLeadVis.has('followup')    && (
                        <td className="table-td text-charcoal-500 text-sm">
                          {lead.proximoFollowUp ? new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      )}
                      {colunasLeadVis.has('tags')        && (
                        <td className="table-td">
                          <div className="flex flex-wrap gap-1">
                            {(lead.tags ?? []).map(t => <span key={t} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded border border-cream-200">{t}</span>)}
                          </div>
                        </td>
                      )}
                      {colunasLeadVis.has('responsavel') && <td className="table-td text-charcoal-500 text-sm">{lead.responsavel || '—'}</td>}
                      {colunasLeadVis.has('observacoes') && (
                        <td className="table-td text-charcoal-400 text-xs max-w-[200px] truncate" title={lead.observacoes ?? ''}>{lead.observacoes || '—'}</td>
                      )}
                      {colunasLeadVis.has('criado')      && (
                        <td className="table-td text-charcoal-400 text-sm">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                      )}
                      <td className="table-td">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button className="p-1.5 text-charcoal-400 hover:text-green-500 hover:bg-green-50 rounded-sm transition-colors"><MessageCircle size={14} /></button>
                          <button className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm transition-colors"><Mail size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── CLIENTES ──────────────────────────────────────────────────────── */}
      {tab === 'clientes' && (
        <Card padding={false}>
          {/* Barra de ferramentas */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-cream-100">
            {selectedClis.size > 0 ? (
              /* Bulk bar */
              <>
                <span className="text-sm font-medium text-charcoal-600">
                  <SquareCheck size={14} className="inline mr-1.5 text-forest-500" />
                  {selectedClis.size} selecionado{selectedClis.size !== 1 ? 's' : ''}
                </span>
                <button onClick={selectAllFilteredCli} className="text-xs text-forest-600 hover:text-forest-700 underline underline-offset-2">
                  Selecionar todos ({filteredCli.length})
                </button>
                <button onClick={() => setSelectedClis(new Set())} className="text-xs text-charcoal-400 hover:text-charcoal-600 underline underline-offset-2">
                  Desmarcar
                </button>
                <div className="h-4 w-px bg-cream-300" />
                <button
                  onClick={() => { setBulkCliField('preferenciaCafe'); setBulkCliValue(''); setBulkCliModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-forest-500 text-white rounded-sm hover:bg-forest-600 transition-colors"
                >
                  <Pencil size={13} /> Editar em massa
                </button>
              </>
            ) : (
              /* Normal bar */
              <>
                <SearchBar value={clienteSearch} onChange={v => { setClienteSearch(v); setClientePage(1); }} placeholder="Nome, e-mail, telefone ou CPF…" className="w-64" />

                <button
                  onClick={() => setMostrarFiltrosCli(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors ${mostrarFiltrosCli || filtrosCli.length > 0 ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-cream-200 text-charcoal-500 hover:border-forest-300 hover:text-forest-600'}`}
                >
                  <SlidersHorizontal size={14} /> Filtros
                  {filtrosCli.length > 0 && (
                    <span className="ml-0.5 bg-forest-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{filtrosCli.length}</span>
                  )}
                  <ChevronDown size={12} className={`transition-transform ${mostrarFiltrosCli ? 'rotate-180' : ''}`} />
                </button>

                <div className="relative" ref={colunasRef}>
                  <button
                    onClick={() => setMostrarColunasCli(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors ${mostrarColunasCli ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-cream-200 text-charcoal-500 hover:border-forest-300 hover:text-forest-600'}`}
                  >
                    <Columns2 size={14} /> Colunas
                    <ChevronDown size={12} className={`transition-transform ${mostrarColunasCli ? 'rotate-180' : ''}`} />
                  </button>
                  {mostrarColunasCli && (
                    <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-cream-200 rounded-sm shadow-lg p-3 w-44 space-y-1">
                      {COLUNAS_CLI.map(col => (
                        <label key={col.id} className="flex items-center gap-2 text-sm text-charcoal-600 cursor-pointer hover:text-charcoal-800 py-0.5">
                          <input type="checkbox" checked={colunasVis.has(col.id)} onChange={() => toggleColunaCli(col.id)} className="w-3.5 h-3.5 accent-forest-500" />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-auto text-xs text-charcoal-400">{filteredCli.length} cliente{filteredCli.length !== 1 ? 's' : ''}</div>
              </>
            )}
          </div>

          {/* Painel de filtros dinâmicos */}
          {mostrarFiltrosCli && (
            <div className="px-4 py-3 bg-cream-50 border-b border-cream-100 space-y-2">
              {filtrosCli.length === 0 && (
                <p className="text-sm text-charcoal-400">Nenhum filtro ativo.</p>
              )}
              {filtrosCli.map(f => {
                const tipo = CAMPOS_CLI.find(c => c.value === f.campo)?.tipo ?? 'texto';
                const ops  = OPERADORES_CLI[tipo] ?? OPERADORES_CLI.texto;
                return (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    <select value={f.campo} onChange={e => atualizarFiltroCli(f.id, { campo: e.target.value, operador: (OPERADORES_CLI[CAMPOS_CLI.find(c=>c.value===e.target.value)?.tipo??'texto']??OPERADORES_CLI.texto)[0].value, valor: '' })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                      {CAMPOS_CLI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={f.operador} onChange={e => atualizarFiltroCli(f.id, { operador: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                      {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {tipo === 'preferencia' ? (
                      <select value={f.valor} onChange={e => atualizarFiltroCli(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                        <option value="">Selecione…</option>
                        <option value="grao">Grão</option>
                        <option value="moido">Moído</option>
                      </select>
                    ) : tipo === 'data' ? (
                      <input type="date" value={f.valor} onChange={e => atualizarFiltroCli(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    ) : (
                      <input type="text" value={f.valor} onChange={e => atualizarFiltroCli(f.id, { valor: e.target.value })} placeholder="Valor…" className="w-44 px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    )}
                    <button onClick={() => setFiltrosCli(prev => prev.filter(x => x.id !== f.id))} className="p-1 text-charcoal-400 hover:text-red-500 rounded-sm transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              <button onClick={adicionarFiltroCli} className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium mt-1">
                <Plus size={13} /> Adicionar filtro
              </button>
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th w-10">
                    <input type="checkbox"
                      checked={paginatedCli.length > 0 && selectedClis.size === paginatedCli.length}
                      onChange={toggleSelectAllCli}
                      className="w-3.5 h-3.5 accent-forest-500 cursor-pointer"
                    />
                  </th>
                  {colunasVis.has('nome')        && <th className="table-th">Nome</th>}
                  {colunasVis.has('email')       && <th className="table-th">E-mail</th>}
                  {colunasVis.has('telefone')    && <th className="table-th">Telefone</th>}
                  {colunasVis.has('preferencia') && <th className="table-th">Preferência</th>}
                  {colunasVis.has('cpf')         && <th className="table-th">CPF</th>}
                  {colunasVis.has('aniversario') && <th className="table-th">Aniversário</th>}
                  {colunasVis.has('cartao')      && <th className="table-th">Cartão</th>}
                  {colunasVis.has('enderecos')   && <th className="table-th">Endereços</th>}
                  {colunasVis.has('desde')       && <th className="table-th">Cliente desde</th>}
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCli.length === 0 ? (
                  <tr><td colSpan={colunasVis.size + 2} className="table-td text-center text-charcoal-400 py-10">Nenhum cliente encontrado.</td></tr>
                ) : paginatedCli.map(cli => {
                  const isCliSelected = selectedClis.has(cli.id);
                  return (
                  <tr key={cli.id}
                    className={`border-t border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors ${isCliSelected ? 'bg-forest-50' : ''}`}
                    onClick={() => setSelectedCliente(cli)}
                  >
                    <td className="table-td w-10" onClick={e => { e.stopPropagation(); toggleSelectCli(cli.id); }}>
                      <input type="checkbox" checked={isCliSelected} onChange={() => toggleSelectCli(cli.id)}
                        className="w-3.5 h-3.5 accent-forest-500 cursor-pointer" />
                    </td>
                    {colunasVis.has('nome') && (
                      <td className="table-td">
                        <p className="font-medium text-charcoal-700">{cli.name}</p>
                      </td>
                    )}
                    {colunasVis.has('email') && <td className="table-td text-charcoal-600 text-sm">{cli.email}</td>}
                    {colunasVis.has('telefone') && <td className="table-td text-charcoal-500 text-sm">{cli.phone || '—'}</td>}
                    {colunasVis.has('preferencia') && (
                      <td className="table-td text-charcoal-500 text-sm">
                        {cli.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${cli.tipoMoagem ?? '—'})`}
                      </td>
                    )}
                    {colunasVis.has('cpf') && (
                      <td className="table-td text-charcoal-400 text-xs font-mono">{cli.cpf || '—'}</td>
                    )}
                    {colunasVis.has('aniversario') && (
                      <td className="table-td text-charcoal-500 text-sm">
                        {cli.birthdate ? new Date(cli.birthdate).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    )}
                    {colunasVis.has('cartao') && (
                      <td className="table-td text-sm">
                        {cli.stripeCardLast4
                          ? <span className="flex items-center gap-1 text-charcoal-500"><CreditCard size={13} /> •••• {cli.stripeCardLast4}</span>
                          : <span className="text-charcoal-300">—</span>}
                      </td>
                    )}
                    {colunasVis.has('enderecos') && (
                      <td className="table-td text-charcoal-500 text-sm">{cli.enderecos.length}</td>
                    )}
                    {colunasVis.has('desde') && (
                      <td className="table-td text-charcoal-400 text-sm">
                        {new Date(cli.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    )}
                    <td className="table-td">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedCliente(cli)} className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors" title="Ver cadastro">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => { setSelectedCliente(cli); abrirEditarCliente(cli); }} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm transition-colors" title="Editar">
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={clientePage} total={filteredCli.length} perPage={perPageCli} onChange={setClientePage} />
        </Card>
      )}

      {/* ── FOLLOW-UPS ────────────────────────────────────────────────────── */}
      {tab === 'followup' && (
        <FollowUpTab
          followUps={followUps}
          loading={loadingFollowUps}
          userName={user?.name ?? 'admin'}
          etapas={etapas}
          onUpdated={() => {
            setLoadingFollowUps(true);
            getFollowUps().then(setFollowUps).catch(console.error).finally(() => setLoadingFollowUps(false));
            // Reflete na lista principal também
            getLeads().then(setLeads).catch(console.error);
          }}
          onVerLead={lead => setSelectedLead(lead)}
          nomePlano={nomePlano}
        />
      )}

      {/* ── Modal detalhe lead ─────────────────────────────────────────────── */}
      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.nome ?? ''} size="xl">
        {selectedLead && (() => {
          const etapaAtual   = etapas.find(e => e.id === selectedLead.etapa);
          const hist         = leadHistorico[selectedLead.id];
          const histLoading  = leadHistLoading[selectedLead.id];
          return (
            <div className="space-y-5">

              {/* ── Dados principais ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'E-mail',    value: selectedLead.email     },
                  { label: 'Telefone',  value: selectedLead.telefone || '—' },
                  { label: 'Origem',    value: selectedLead.origem    },
                  { label: 'Interesse', value: selectedLead.interesse || '—' },
                  { label: 'Plano desejado', value: nomePlano(selectedLead.planoDesejado) || '—' },
                  { label: 'Lead desde', value: new Date(selectedLead.createdAt).toLocaleDateString('pt-BR') },
                  { label: 'Último contato',   value: selectedLead.ultimoContato ? new Date(selectedLead.ultimoContato + 'T00:00:00').toLocaleDateString('pt-BR') : '—' },
                  { label: 'Próximo follow-up', value: selectedLead.proximoFollowUp ? new Date(selectedLead.proximoFollowUp).toLocaleDateString('pt-BR') : '—' },
                ].map(info => (
                  <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                    <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                    <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Etapa atual ───────────────────────────────────────────── */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Etapa do funil</p>
                  <Select
                    value={selectedLead.etapa}
                    onChange={e => handleAtualizarEtapaLead(selectedLead.id, e.target.value as LeadEtapa)}
                    options={etapas.filter(e => [
                      'checkout_plano','checkout_contato','checkout_preferencias',
                      'checkout_endereco','checkout_pagamento','assinatura_concluida',
                      'interesse_reserva','inadimplente','perdido',
                    ].includes(e.id)).map(e => ({ value: e.id, label: e.label }))}
                    disabled={atualizandoEtapa === selectedLead.id}
                  />
                </div>
                {etapaAtual && (
                  <span className={`mt-6 px-3 py-1.5 text-xs rounded border font-medium ${etapaAtual.color}`}>
                    {atualizandoEtapa === selectedLead.id
                      ? <Loader2 size={12} className="animate-spin inline" />
                      : etapaAtual.label}
                  </span>
                )}
              </div>

              {/* ── Tags ──────────────────────────────────────────────────── */}
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Tags</p>
                {selectedLead.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-cream-100 border border-cream-200 text-sm text-charcoal-600 rounded-full">
                        <Tag size={12} />{tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-charcoal-400">Nenhuma tag.</p>
                )}
              </div>

              {/* ── Observações ───────────────────────────────────────────── */}
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Observações</p>
                <p className="text-sm text-charcoal-600 bg-cream-50 rounded-sm p-3 min-h-[2.5rem]">
                  {selectedLead.observacoes || <span className="italic text-charcoal-300">Sem observações.</span>}
                </p>
              </div>

              {/* ── Histórico de etapas no funil ──────────────────────────── */}
              <div className="border-t border-cream-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">
                    Histórico de etapas no funil
                    {hist && hist.length > 0 && (
                      <span className="ml-1.5 text-[10px] bg-cream-200 text-charcoal-500 rounded-full px-1.5 py-0.5">{hist.length}</span>
                    )}
                  </p>
                  {hist && hist.length > 0 && (
                    <button
                      onClick={() => handleDeletarHistoricoTodo(selectedLead.id)}
                      disabled={deletandoHistorico === selectedLead.id}
                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
                    >
                      {deletandoHistorico === selectedLead.id
                        ? <Loader2 size={10} className="animate-spin" />
                        : <X size={10} />}
                      Apagar histórico
                    </button>
                  )}
                </div>

                {histLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-charcoal-400">
                    <Loader2 size={12} className="animate-spin" /> Carregando…
                  </div>
                ) : !hist || hist.length === 0 ? (
                  <p className="text-xs text-charcoal-300 italic">Nenhuma alteração de etapa registrada.</p>
                ) : (
                  <div className="relative max-h-96 overflow-y-auto pr-1">
                    <div className="absolute left-[13px] top-0 bottom-0 w-px bg-cream-300" />
                    <div className="space-y-0">
                      {hist.map((h, idx) => {
                        const etAnterior = etapas.find(e => e.id === h.etapaAnterior);
                        const etNova     = etapas.find(e => e.id === h.etapaNova);
                        const isLast     = idx === hist.length - 1;
                        return (
                          <div key={h.id} className="flex gap-3 group">
                            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border-2 ${isLast ? 'bg-forest-500 border-forest-500' : 'bg-white border-cream-300'}`}>
                              <TrendingUp size={11} className={isLast ? 'text-white' : 'text-charcoal-400'} />
                            </div>
                            <div className="flex-1 pb-4">
                              {/* Transição de etapa + botão excluir */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {h.etapaAnterior ? (
                                    <>
                                      <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${etAnterior?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                        {etAnterior?.label ?? h.etapaAnterior}
                                      </span>
                                      <ArrowRight size={10} className="text-charcoal-400" />
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-charcoal-400 italic">Entrada no funil →</span>
                                  )}
                                  <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${etNova?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {etNova?.label ?? h.etapaNova}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeletarHistoricoItem(selectedLead.id, h.id)}
                                  disabled={deletandoHistorico === h.id}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-300 hover:text-red-500 transition-all shrink-0"
                                  title="Remover entrada"
                                >
                                  {deletandoHistorico === h.id
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <X size={11} />}
                                </button>
                              </div>
                              {/* Data/hora/autor */}
                              <p className="text-[10px] text-charcoal-400 mt-0.5 mb-2">
                                {new Date(h.alteradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                {' às '}
                                {new Date(h.alteradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {h.alteradoPor ? ` · por ${h.alteradoPor}` : ''}
                              </p>
                              {/* Snapshot de campos */}
                              <div className="bg-cream-50 rounded-sm border border-cream-200 p-2.5 space-y-1.5">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {h.origem && (
                                    <p className="text-[10px] text-charcoal-500">
                                      <span className="text-charcoal-400">Origem:</span> {h.origem}
                                    </p>
                                  )}
                                  {h.interesse && (
                                    <p className="text-[10px] text-charcoal-500">
                                      <span className="text-charcoal-400">Interesse:</span> {h.interesse}
                                    </p>
                                  )}
                                  {h.planoDesejado && (
                                    <p className="text-[10px] text-charcoal-500">
                                      <span className="text-charcoal-400">Plano:</span> {nomePlano(h.planoDesejado)}
                                    </p>
                                  )}
                                  {h.ultimoContato && (
                                    <p className="text-[10px] text-charcoal-500">
                                      <span className="text-charcoal-400">Último contato:</span>{' '}
                                      {new Date(h.ultimoContato + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                  {h.proximoFollowUp && (
                                    <p className="text-[10px] text-charcoal-500">
                                      <span className="text-charcoal-400">Follow-up:</span>{' '}
                                      {new Date(h.proximoFollowUp).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                                {h.tags && h.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {h.tags.map(tag => (
                                      <span key={tag} className="px-1.5 py-0.5 bg-cream-200 text-charcoal-500 text-[10px] rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {h.observacoes && (
                                  <p className="text-[10px] text-charcoal-600 italic border-t border-cream-300 pt-1.5 mt-1">
                                    {h.observacoes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Histórico de interações ───────────────────────────────── */}
              {selectedLead.interacoes.length > 0 && (
                <div className="border-t border-cream-200 pt-4">
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                    Interações ({selectedLead.interacoes.length})
                  </p>
                  <div className="space-y-3">
                    {selectedLead.interacoes.map(inter => (
                      <div key={inter.id} className="flex gap-3 p-3 bg-cream-50 rounded-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${inter.tipo === 'email' ? 'bg-blue-100 text-blue-500' : inter.tipo === 'whatsapp' ? 'bg-green-100 text-green-500' : 'bg-charcoal-100 text-charcoal-500'}`}>
                          {inter.tipo === 'email' ? <Mail size={14} /> : inter.tipo === 'whatsapp' ? <MessageCircle size={14} /> : <Phone size={14} />}
                        </div>
                        <div>
                          <p className="text-sm text-charcoal-700">{inter.descricao}</p>
                          <p className="text-xs text-charcoal-400 mt-1">{new Date(inter.data).toLocaleDateString('pt-BR')} · {inter.usuario}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Ações ─────────────────────────────────────────────────── */}
              <div className="flex gap-3 pt-2 border-t border-cream-200">
                <Button variant="primary" size="sm"><MessageCircle size={14} />Enviar WhatsApp</Button>
                <Button variant="secondary" size="sm" onClick={() => { setFormInter({ tipo: 'email', descricao: '' }); setNovaInteracaoModal(true); }}>
                  <Plus size={14} />Nova interação
                </Button>
                <Button variant="secondary" size="sm"><Mail size={14} />Enviar e-mail</Button>
                {!selectedLead.clienteId && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setFormConverte({
                      nome: selectedLead.nome, email: selectedLead.email,
                      telefone: selectedLead.telefone ?? '',
                      cpf: '', birthdate: '', preferenciaCafe: 'grao', tipoMoagem: '',
                      cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
                    });
                    setConverterModal(true);
                  }}>
                    <ArrowRight size={14} />Converter em cliente
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Modal nova interação ───────────────────────────────────────────── */}
      <Modal open={novaInteracaoModal} onClose={() => setNovaInteracaoModal(false)} title="Nova interação" size="sm">
        {selectedLead && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Tipo</label>
              <select
                value={formInter.tipo}
                onChange={e => setFormInter(prev => ({ ...prev, tipo: e.target.value as 'email' | 'whatsapp' | 'ligacao' }))}
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
              >
                <option value="email">E-mail</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="ligacao">Ligação</option>
              </select>
            </div>
            <Textarea
              label="Descrição"
              value={formInter.descricao}
              onChange={e => setFormInter(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva a interação..."
              rows={4}
            />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setNovaInteracaoModal(false)}>Cancelar</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSalvarInteracao}
                disabled={salvandoInter || !formInter.descricao.trim()}
              >
                {salvandoInter ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Salvar interação
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal converter em cliente ────────────────────────────────────── */}
      <Modal open={converterModal} onClose={() => setConverterModal(false)} title="Converter em Cliente" size="lg">
        {selectedLead && (
          <div className="space-y-5">

            {/* Dados pessoais */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Dados pessoais</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome *" value={formConverte.nome} onChange={e => setFormConverte(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
                <Input label="E-mail *" value={formConverte.email} onChange={e => setFormConverte(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
                <Input label="Telefone" value={formConverte.telefone} onChange={e => setFormConverte(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
                <Input label="CPF" value={formConverte.cpf} onChange={e => setFormConverte(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
                <Input label="Data de nascimento" type="date" value={formConverte.birthdate} onChange={e => setFormConverte(p => ({ ...p, birthdate: e.target.value }))} />
              </div>
            </div>

            {/* Preferência de café */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Preferência de café</p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tipo de café"
                  value={formConverte.preferenciaCafe}
                  onChange={e => setFormConverte(p => ({ ...p, preferenciaCafe: e.target.value as 'grao' | 'moido', tipoMoagem: '' }))}
                  options={[{ value: 'grao', label: 'Grão' }, { value: 'moido', label: 'Moído' }]}
                />
                {formConverte.preferenciaCafe === 'moido' && (
                  <Select
                    label="Tipo de moagem"
                    value={formConverte.tipoMoagem}
                    onChange={e => setFormConverte(p => ({ ...p, tipoMoagem: e.target.value }))}
                    options={[
                      { value: 'fino',       label: 'Fino' },
                      { value: 'medio',      label: 'Médio' },
                      { value: 'grosso',     label: 'Grosso' },
                      { value: 'extraGrosso', label: 'Extra Grosso' },
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Endereço */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Endereço <span className="normal-case font-normal text-charcoal-300">(opcional)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="CEP" value={formConverte.cep} onChange={e => setFormConverte(p => ({ ...p, cep: e.target.value }))} placeholder="00000-000" />
                <Input label="Logradouro" value={formConverte.logradouro} onChange={e => setFormConverte(p => ({ ...p, logradouro: e.target.value }))} placeholder="Rua, Av..." />
                <Input label="Número" value={formConverte.numero} onChange={e => setFormConverte(p => ({ ...p, numero: e.target.value }))} placeholder="123" />
                <Input label="Complemento" value={formConverte.complemento} onChange={e => setFormConverte(p => ({ ...p, complemento: e.target.value }))} placeholder="Apto, Bloco..." />
                <Input label="Bairro" value={formConverte.bairro} onChange={e => setFormConverte(p => ({ ...p, bairro: e.target.value }))} placeholder="Bairro" />
                <Input label="Cidade" value={formConverte.cidade} onChange={e => setFormConverte(p => ({ ...p, cidade: e.target.value }))} placeholder="Cidade" />
                <Input label="Estado" value={formConverte.estado} onChange={e => setFormConverte(p => ({ ...p, estado: e.target.value }))} placeholder="UF" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1 border-t border-cream-200">
              <Button variant="ghost" size="sm" onClick={() => setConverterModal(false)}>Cancelar</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConverterEmCliente}
                disabled={salvandoConverte || !formConverte.nome.trim() || !formConverte.email.trim()}
              >
                {salvandoConverte ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Converter em cliente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal detalhe cliente ──────────────────────────────────────────── */}
      <Modal open={!!selectedCliente && !editandoCli} onClose={() => setSelectedCliente(null)} title={selectedCliente?.name ?? 'Cadastro do Cliente'} size="xl">
        {selectedCliente && (() => {
          const pedidoStatusColor: Record<string, string> = {
            pendente: 'bg-gray-100 text-gray-600', pago: 'bg-blue-100 text-blue-700',
            em_preparo: 'bg-orange-100 text-orange-700', enviado: 'bg-purple-100 text-purple-700',
            entregue: 'bg-forest-100 text-forest-700',
            disponivel_retirada: 'bg-orange-100 text-orange-700', retirado: 'bg-forest-100 text-forest-700',
            cancelado: 'bg-red-100 text-red-700',
            reembolsado: 'bg-yellow-100 text-yellow-700',
          };
          const assStatusColor: Record<string, string> = {
            ativa: 'bg-forest-100 text-forest-700', pendente: 'bg-yellow-100 text-yellow-700',
            inadimplente: 'bg-red-100 text-red-700', cancelada: 'bg-gray-100 text-gray-600',
            pausada: 'bg-orange-100 text-orange-700',
          };
          const resStatusColor: Record<string, string> = {
            solicitada: 'bg-blue-100 text-blue-700', confirmada: 'bg-forest-100 text-forest-700',
            cancelada: 'bg-red-100 text-red-700', concluida: 'bg-gray-100 text-gray-600',
            no_show: 'bg-orange-100 text-orange-700',
          };
          const resStatusLabel: Record<string, string> = {
            solicitada: 'Solicitada', confirmada: 'Confirmada', cancelada: 'Cancelada',
            concluida: 'Concluída', no_show: 'No-show',
          };
          const clienteLeads = clienteLeadsAtual;

          const tabs = [
            { id: 'dados',       label: 'Dados',         icon: <Users size={13} /> },
            { id: 'pedidos',     label: 'Pedidos',        icon: <ShoppingBag size={13} />, count: cliHist.pedidos.length },
            { id: 'assinaturas', label: 'Assinaturas',    icon: <Repeat size={13} />, count: cliHist.assinaturas.length },
            { id: 'reservas',    label: 'Reservas',       icon: <Calendar size={13} />, count: cliHist.reservas.length },
            { id: 'funil',       label: 'Funil de vendas', icon: <TrendingUp size={13} />, count: clienteLeads.length },
          ] as const;

          return (
            <div className="space-y-4">
              {/* Tabs internas */}
              <div className="flex flex-wrap gap-1 border-b border-cream-200 pb-1">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setCliDetalheTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${cliDetalheTab === t.id ? 'bg-forest-500 text-white' : 'text-charcoal-500 hover:bg-cream-100'}`}
                  >
                    {t.icon} {t.label}
                    {'count' in t && !cliHist.loading && (t.count ?? 0) > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0 font-bold ${cliDetalheTab === t.id ? 'bg-white/30 text-white' : 'bg-cream-200 text-charcoal-500'}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
                {cliHist.loading && <Loader2 size={14} className="animate-spin text-charcoal-400 ml-2 self-center" />}
              </div>

              {/* ── Aba: Dados ──────────────────────────────────────────────── */}
              {cliDetalheTab === 'dados' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Nome',          value: selectedCliente.name },
                      { label: 'E-mail',        value: selectedCliente.email },
                      { label: 'Telefone',      value: selectedCliente.phone || '—' },
                      { label: 'CPF',           value: selectedCliente.cpf || '—' },
                      { label: 'Aniversário',   value: selectedCliente.birthdate ? new Date(selectedCliente.birthdate).toLocaleDateString('pt-BR') : '—' },
                      { label: 'Cliente desde', value: new Date(selectedCliente.createdAt).toLocaleDateString('pt-BR') },
                      { label: 'Preferência',   value: selectedCliente.preferenciaCafe === 'grao' ? 'Grão inteiro' : `Moído — ${selectedCliente.tipoMoagem ?? '—'}` },
                    ].map(info => (
                      <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                        <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                        <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                      </div>
                    ))}
                  </div>
                  {selectedCliente.stripeCardLast4 && (
                    <div>
                      <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Cartão cadastrado</p>
                      <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-sm">
                        <CreditCard size={18} className="text-charcoal-400" />
                        <div>
                          <p className="text-sm text-charcoal-700 font-medium capitalize">
                            {selectedCliente.stripeCardBrand} •••• {selectedCliente.stripeCardLast4}
                          </p>
                          <p className="text-xs text-charcoal-400">Validade: {selectedCliente.stripeCardExpiry}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedCliente.enderecos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                        Endereços ({selectedCliente.enderecos.length})
                      </p>
                      <div className="space-y-2">
                        {selectedCliente.enderecos.map(end => (
                          <div key={end.id} className="flex items-start gap-3 p-3 bg-cream-50 rounded-sm">
                            <MapPin size={15} className="text-charcoal-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                {end.apelido && <span className="text-xs font-medium text-forest-600 bg-forest-50 px-1.5 py-0.5 rounded">{end.apelido}</span>}
                                {end.padrao  && <span className="flex items-center gap-0.5 text-xs text-amber-600"><Star size={10} />Padrão</span>}
                              </div>
                              <p className="text-sm text-charcoal-700">
                                {end.logradouro}, {end.numero}{end.complemento ? `, ${end.complemento}` : ''}
                              </p>
                              <p className="text-xs text-charcoal-400">
                                {end.bairro} — {end.cidade}/{end.estado} · CEP {end.cep}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Aba: Pedidos ────────────────────────────────────────────── */}
              {cliDetalheTab === 'pedidos' && (
                <div>
                  {cliHist.loading ? (
                    <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-charcoal-300" /></div>
                  ) : cliHist.pedidos.length === 0 ? (
                    <p className="text-sm text-charcoal-400 text-center py-10">Nenhum pedido encontrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {cliHist.pedidos.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-cream-50 rounded-sm border border-cream-100">
                          <div>
                            <p className="text-sm font-medium text-charcoal-700">{p.numero}</p>
                            <p className="text-xs text-charcoal-400">
                              {new Date(p.createdAt).toLocaleDateString('pt-BR')} · {p.itens.length} item{p.itens.length !== 1 ? 's' : ''} · {p.tipo === 'assinatura' ? 'Assinatura' : 'Loja'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pedidoStatusColor[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {p.status.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-semibold text-charcoal-700">
                              R$ {p.total.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Aba: Assinaturas ────────────────────────────────────────── */}
              {cliDetalheTab === 'assinaturas' && (
                <div>
                  {cliHist.loading ? (
                    <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-charcoal-300" /></div>
                  ) : cliHist.assinaturas.length === 0 ? (
                    <p className="text-sm text-charcoal-400 text-center py-10">Nenhuma assinatura encontrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {cliHist.assinaturas.map(a => (
                        <div key={a.id} className="p-3 bg-cream-50 rounded-sm border border-cream-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-charcoal-700">{a.plano.nome}</p>
                              <p className="text-xs text-charcoal-400">
                                Desde {new Date(a.dataInicio).toLocaleDateString('pt-BR')}
                                {a.dataFim ? ` · Encerrou ${new Date(a.dataFim).toLocaleDateString('pt-BR')}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${assStatusColor[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                              </span>
                              <p className="text-xs text-charcoal-500 mt-1">R$ {a.totalMensal.toFixed(2).replace('.', ',')} / mês</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-charcoal-500">
                            <span>Preferência: {a.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${a.tipoMoagem ?? '—'})`}</span>
                            <span>{a.ciclos.length} ciclo{a.ciclos.length !== 1 ? 's' : ''}</span>
                            {a.proximaCobranca && (
                              <span>Próx. cobrança: {new Date(a.proximaCobranca).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                          {a.motivoCancelamento && (
                            <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Motivo: {a.motivoCancelamento}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Aba: Reservas ───────────────────────────────────────────── */}
              {cliDetalheTab === 'reservas' && (
                <div>
                  {cliHist.loading ? (
                    <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-charcoal-300" /></div>
                  ) : cliHist.reservas.length === 0 ? (
                    <p className="text-sm text-charcoal-400 text-center py-10">Nenhuma reserva encontrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {cliHist.reservas.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-cream-50 rounded-sm border border-cream-100">
                          <div>
                            <p className="text-sm font-medium text-charcoal-700">
                              {new Date(r.data).toLocaleDateString('pt-BR')} às {r.horario}
                            </p>
                            <p className="text-xs text-charcoal-400">
                              {r.pessoas} pessoa{r.pessoas !== 1 ? 's' : ''}
                              {r.observacoes ? ` · ${r.observacoes}` : ''}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resStatusColor[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {resStatusLabel[r.status] ?? r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Aba: Funil ──────────────────────────────────────────────── */}
              {cliDetalheTab === 'funil' && (
                <div>
                  {clienteLeads.length === 0 ? (
                    <p className="text-sm text-charcoal-400 text-center py-10">Nenhum lead vinculado a este cliente.</p>
                  ) : (
                    <div className="space-y-4">
                      {clienteLeads.map(lead => {
                        const etapa = etapas.find(e => e.id === lead.etapa);
                        const hist  = leadHistorico[lead.id];
                        const histLoading = leadHistLoading[lead.id];

                        return (
                          <div key={lead.id} className="p-4 bg-cream-50 rounded-sm border border-cream-100 space-y-3">
                            {/* Cabeçalho */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-charcoal-700">{lead.nome}</p>
                                <p className="text-xs text-charcoal-400">{lead.email}</p>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded border font-medium ${etapa?.color}`}>{etapa?.label}</span>
                            </div>

                            {/* Detalhes */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-charcoal-500">
                              <span>Origem: <strong className="text-charcoal-700 capitalize">{lead.origem}</strong></span>
                              {lead.planoDesejado && <span>Plano: <strong className="text-charcoal-700">{nomePlano(lead.planoDesejado)}</strong></span>}
                              {lead.responsavel && <span>Responsável: <strong className="text-charcoal-700">{lead.responsavel}</strong></span>}
                              <span>Lead desde: <strong className="text-charcoal-700">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                            </div>

                            {/* Tags */}
                            {lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {lead.tags.map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-cream-200 text-charcoal-500 text-xs rounded">{tag}</span>
                                ))}
                              </div>
                            )}

                            {/* ── Histórico de etapas ─────────────────────── */}
                            <div className="border-t border-cream-200 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">
                                  Histórico de etapas no funil
                                  {hist && hist.length > 0 && (
                                    <span className="ml-1.5 text-[10px] bg-cream-200 text-charcoal-500 rounded-full px-1.5 py-0.5">{hist.length}</span>
                                  )}
                                </p>
                                {hist && hist.length > 0 && (
                                  <button
                                    onClick={() => handleDeletarHistoricoTodo(lead.id)}
                                    disabled={deletandoHistorico === lead.id}
                                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
                                  >
                                    {deletandoHistorico === lead.id
                                      ? <Loader2 size={10} className="animate-spin" />
                                      : <X size={10} />}
                                    Apagar histórico
                                  </button>
                                )}
                              </div>

                              {histLoading ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-charcoal-400">
                                  <Loader2 size={12} className="animate-spin" /> Carregando…
                                </div>
                              ) : !hist || hist.length === 0 ? (
                                <p className="text-xs text-charcoal-300 italic">Nenhuma alteração registrada.</p>
                              ) : (
                                <div className="relative">
                                  <div className="absolute left-[13px] top-0 bottom-0 w-px bg-cream-300" />
                                  <div className="space-y-0">
                                    {hist.map((h, idx) => {
                                      const etAnterior = etapas.find(e => e.id === h.etapaAnterior);
                                      const etNova     = etapas.find(e => e.id === h.etapaNova);
                                      const isLast     = idx === hist.length - 1;
                                      return (
                                        <div key={h.id} className="flex gap-3 group">
                                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border-2 ${isLast ? 'bg-forest-500 border-forest-500' : 'bg-white border-cream-300'}`}>
                                            <TrendingUp size={11} className={isLast ? 'text-white' : 'text-charcoal-400'} />
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                {h.etapaAnterior ? (
                                                  <>
                                                    <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${etAnterior?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                      {etAnterior?.label ?? h.etapaAnterior}
                                                    </span>
                                                    <ArrowRight size={10} className="text-charcoal-400" />
                                                  </>
                                                ) : (
                                                  <span className="text-[10px] text-charcoal-400 italic">Entrada no funil →</span>
                                                )}
                                                <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${etNova?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                  {etNova?.label ?? h.etapaNova}
                                                </span>
                                              </div>
                                              <button
                                                onClick={() => handleDeletarHistoricoItem(lead.id, h.id)}
                                                disabled={deletandoHistorico === h.id}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-red-300 hover:text-red-500 transition-all shrink-0"
                                                title="Remover entrada"
                                              >
                                                {deletandoHistorico === h.id
                                                  ? <Loader2 size={11} className="animate-spin" />
                                                  : <X size={11} />}
                                              </button>
                                            </div>
                                            <p className="text-[10px] text-charcoal-400 mt-0.5 mb-2">
                                              {new Date(h.alteradoEm).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                              {' às '}
                                              {new Date(h.alteradoEm).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                                              {h.alteradoPor ? ` · por ${h.alteradoPor}` : ''}
                                            </p>
                                            {/* Snapshot */}
                                            <div className="bg-white rounded-sm border border-cream-200 p-2 space-y-1">
                                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                {h.origem && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Origem:</span> {h.origem}</p>}
                                                {h.interesse && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Interesse:</span> {h.interesse}</p>}
                                                {h.planoDesejado && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Plano:</span> {nomePlano(h.planoDesejado)}</p>}
                                                {h.ultimoContato && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Último contato:</span> {new Date(h.ultimoContato + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                                                {h.proximoFollowUp && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Follow-up:</span> {new Date(h.proximoFollowUp).toLocaleDateString('pt-BR')}</p>}
                                              </div>
                                              {h.tags && h.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                  {h.tags.map(tag => <span key={tag} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-[10px] rounded">{tag}</span>)}
                                                </div>
                                              )}
                                              {h.observacoes && (
                                                <p className="text-[10px] text-charcoal-600 italic border-t border-cream-200 pt-1 mt-0.5">{h.observacoes}</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Histórico de interações */}
                            {lead.interacoes.length > 0 && (
                              <div className="border-t border-cream-200 pt-3">
                                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                                  Interações ({lead.interacoes.length})
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {lead.interacoes.map(inter => (
                                    <div key={inter.id} className="flex gap-2 p-2 bg-white rounded border border-cream-100">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${inter.tipo === 'email' ? 'bg-blue-100 text-blue-500' : inter.tipo === 'whatsapp' ? 'bg-green-100 text-green-500' : 'bg-charcoal-100 text-charcoal-500'}`}>
                                        {inter.tipo === 'email' ? <Mail size={11} /> : inter.tipo === 'whatsapp' ? <MessageCircle size={11} /> : <Phone size={11} />}
                                      </div>
                                      <div>
                                        <p className="text-xs text-charcoal-700">{inter.descricao}</p>
                                        <p className="text-[10px] text-charcoal-400 mt-0.5">{new Date(inter.data).toLocaleDateString('pt-BR')} · {inter.usuario}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
                <Button variant="secondary" icon={<Pencil size={14} />} onClick={() => abrirEditarCliente(selectedCliente)}>
                  Editar cadastro
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Modal editar cliente ───────────────────────────────────────────── */}
      <Modal open={editandoCli && !!selectedCliente} onClose={() => setEditandoCli(false)} title="Editar Cadastro" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nome completo *" value={formCli.name} onChange={e => setFormCli(p => ({ ...p, name: e.target.value }))} placeholder="Nome do cliente" />
            </div>
            <Input label="Telefone" value={formCli.phone} onChange={e => setFormCli(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            <Input label="CPF" value={formCli.cpf} onChange={e => setFormCli(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
            <Input label="Data de nascimento" type="date" value={formCli.birthdate} onChange={e => setFormCli(p => ({ ...p, birthdate: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Preferência de café</label>
              <select value={formCli.preferenciaCafe} onChange={e => setFormCli(p => ({ ...p, preferenciaCafe: e.target.value as 'grao' | 'moido', tipoMoagem: '' }))} className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                <option value="grao">Grão inteiro</option>
                <option value="moido">Moído</option>
              </select>
            </div>
            {formCli.preferenciaCafe === 'moido' && (
              <div>
                <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Tipo de moagem</label>
                <select value={formCli.tipoMoagem} onChange={e => setFormCli(p => ({ ...p, tipoMoagem: e.target.value }))} className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                  <option value="">Selecione…</option>
                  <option value="fino">Fino (espresso)</option>
                  <option value="medio">Médio (coado/aeropress)</option>
                  <option value="grosso">Grosso (prensa francesa)</option>
                  <option value="extraGrosso">Extra grosso (cold brew)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setEditandoCli(false)}>Cancelar</Button>
            <Button variant="primary" loading={salvandoCli} icon={<Pencil size={14} />} onClick={handleSalvarCliente}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal edição em massa — clientes ──────────────────────────────── */}
      <Modal open={bulkCliModal} onClose={() => setBulkCliModal(false)} title={`Editar em massa — ${selectedClis.size} cliente(s)`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Campo</label>
            <select
              value={bulkCliField}
              onChange={e => { setBulkCliField(e.target.value as typeof bulkCliField); setBulkCliValue(''); }}
              className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            >
              <option value="preferenciaCafe">Preferência de café</option>
              <option value="tipoMoagem">Tipo de moagem</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Valor</label>
            {bulkCliField === 'preferenciaCafe' ? (
              <select
                value={bulkCliValue}
                onChange={e => setBulkCliValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              >
                <option value="">Selecione…</option>
                <option value="grao">Grão inteiro</option>
                <option value="moido">Moído</option>
              </select>
            ) : (
              <select
                value={bulkCliValue}
                onChange={e => setBulkCliValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              >
                <option value="">Selecione…</option>
                <option value="fino">Fino (espresso)</option>
                <option value="medio">Médio (coado/aeropress)</option>
                <option value="grosso">Grosso (prensa francesa)</option>
                <option value="extraGrosso">Extra grosso (cold brew)</option>
              </select>
            )}
            {bulkCliField === 'tipoMoagem' && (
              <p className="mt-1 text-xs text-charcoal-400">Aplicado apenas a clientes que já estão como "Moído".</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setBulkCliModal(false)} disabled={bulkCliando}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleBulkEditCli}
              disabled={bulkCliando || !bulkCliValue}
            >
              {bulkCliando ? <Loader2 size={14} className="animate-spin" /> : <SquareCheck size={14} />}
              {bulkCliando ? 'Aplicando…' : `Aplicar a ${selectedClis.size} cliente(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal edição em massa ─────────────────────────────────────────── */}
      <Modal open={bulkEditModal} onClose={() => setBulkEditModal(false)} title={`Editar em massa — ${selectedLeads.size} lead(s)`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Campo</label>
            <select
              value={bulkEditField}
              onChange={e => { setBulkEditField(e.target.value as typeof bulkEditField); setBulkEditValue(''); }}
              className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            >
              <option value="etapa">Etapa</option>
              <option value="responsavel">Responsável</option>
              <option value="proximoFollowUp">Próximo Follow-up</option>
              <option value="tags">Tags (substituir)</option>
              <option value="observacoes">Observações (substituir)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Valor</label>
            {bulkEditField === 'etapa' ? (
              <select
                value={bulkEditValue}
                onChange={e => setBulkEditValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              >
                <option value="">Selecione…</option>
                {etapas.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            ) : bulkEditField === 'proximoFollowUp' ? (
              <input
                type="datetime-local"
                value={bulkEditValue}
                onChange={e => setBulkEditValue(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            ) : bulkEditField === 'observacoes' ? (
              <textarea
                value={bulkEditValue}
                onChange={e => setBulkEditValue(e.target.value)}
                rows={3}
                placeholder="Observações aplicadas a todos os selecionados…"
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400 resize-none"
              />
            ) : bulkEditField === 'tags' ? (
              <input
                type="text"
                value={bulkEditValue}
                onChange={e => setBulkEditValue(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            ) : (
              <input
                type="text"
                value={bulkEditValue}
                onChange={e => setBulkEditValue(e.target.value)}
                placeholder="Responsável…"
                className="w-full px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            )}
            {bulkEditField === 'tags' && (
              <p className="mt-1 text-xs text-charcoal-400">Separe as tags por vírgula. Isso substituirá as tags existentes.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setBulkEditModal(false)} disabled={bulkEditando}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleBulkEdit}
              disabled={bulkEditando || (bulkEditField !== 'proximoFollowUp' && !bulkEditValue.trim())}
            >
              {bulkEditando ? <Loader2 size={14} className="animate-spin" /> : <SquareCheck size={14} />}
              {bulkEditando ? 'Aplicando…' : `Aplicar a ${selectedLeads.size} lead(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal importar leads ───────────────────────────────────────────── */}
      <Modal open={importModal} onClose={() => { setImportModal(false); setImportPreview([]); }} title="Importar Leads" size="lg">
        <div className="space-y-4">
          {importPreview.length === 0 ? (
            <>
              <div className="bg-cream-50 border border-cream-200 rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium text-charcoal-700">Formato esperado do arquivo</p>
                <p className="text-xs text-charcoal-500">Arquivo CSV ou Excel salvo como CSV (.csv) com as colunas na ordem:</p>
                <div className="overflow-x-auto">
                  <table className="text-xs text-charcoal-600 w-full">
                    <thead>
                      <tr className="border-b border-cream-300">
                        {['Nome', 'Telefone', 'E-mail', 'Origem', 'Etapa'].map(h => (
                          <th key={h} className="text-left py-1 pr-3 font-semibold text-charcoal-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 pr-3">Ana Silva</td>
                        <td className="py-1 pr-3">(11) 99999-0000</td>
                        <td className="py-1 pr-3">ana@email.com</td>
                        <td className="py-1 pr-3">manual</td>
                        <td className="py-1 pr-3">novo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-charcoal-400">Origens válidas: manual, checkout, reserva, blog, social, indicacao, landing</p>
                <p className="text-[11px] text-charcoal-400">Etapa: se omitida ou inválida, assume <strong>novo</strong>. Valores: novo, interesse_assinatura, cliente_ativo, perdido…</p>
              </div>

              <div
                className="border-2 border-dashed border-cream-300 rounded-sm p-8 text-center cursor-pointer hover:border-forest-400 hover:bg-forest-50 transition-colors"
                onClick={() => importFileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
              >
                <Upload size={24} className="mx-auto mb-3 text-charcoal-300" />
                <p className="text-sm font-medium text-charcoal-600">Clique ou arraste o arquivo CSV aqui</p>
                <p className="text-xs text-charcoal-400 mt-1">Aceita arquivos .csv (Excel → Salvar como → CSV)</p>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-charcoal-600">
                  <span className="font-semibold text-forest-600">{importPreview.length}</span> lead(s) encontrado(s) no arquivo
                </p>
                <button
                  onClick={() => setImportPreview([])}
                  className="text-xs text-charcoal-400 hover:text-charcoal-600 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto border border-cream-200 rounded-sm">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-cream-50">
                    <tr>
                      {['Nome', 'Telefone', 'E-mail', 'Origem', 'Etapa'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-charcoal-500 uppercase tracking-wider text-[10px] border-b border-cream-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => {
                      const etapaInfo = etapas.find(e => e.id === row.etapa);
                      return (
                        <tr key={i} className="border-t border-cream-100 hover:bg-cream-50">
                          <td className="px-3 py-2 text-charcoal-700 font-medium">{row.nome}</td>
                          <td className="px-3 py-2 text-charcoal-500">{row.telefone || '—'}</td>
                          <td className="px-3 py-2 text-charcoal-600">{row.email}</td>
                          <td className="px-3 py-2 text-charcoal-500 capitalize">{row.origem}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${etapaInfo?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {etapaInfo?.label ?? row.etapa}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-cream-200">
                <Button variant="ghost" onClick={() => { setImportModal(false); setImportPreview([]); }} disabled={importando}>Cancelar</Button>
                <Button variant="primary" onClick={handleConfirmImport} disabled={importando}>
                  {importando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importando ? 'Importando…' : `Importar ${importPreview.length} lead(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Modal novo lead ────────────────────────────────────────────────── */}
      <Modal open={novoModal} onClose={() => setNovoModal(false)} title="Novo Lead" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" placeholder="Nome completo" />
            <Input label="E-mail" type="email" placeholder="email@exemplo.com" />
          </div>
          <Input label="Telefone" placeholder="(11) 99999-9999" />
          <Select label="Origem" options={[
            { value: 'manual',    label: 'Manual' },
            { value: 'checkout',  label: 'Checkout' },
            { value: 'social',    label: 'Redes Sociais' },
            { value: 'indicacao', label: 'Indicação' },
            { value: 'landing',   label: 'Landing Page' },
          ]} />
          <Select label="Etapa" options={[
            { value: 'checkout_plano',        label: 'Checkout: Plano' },
            { value: 'checkout_contato',      label: 'Checkout: Contato' },
            { value: 'checkout_preferencias', label: 'Checkout: Preferências' },
            { value: 'checkout_endereco',     label: 'Checkout: Endereço' },
            { value: 'checkout_pagamento',    label: 'Checkout: Pagamento' },
            { value: 'assinatura_concluida',  label: 'Assinatura Concluída' },
            { value: 'interesse_reserva',     label: 'Interesse Reserva' },
            { value: 'inadimplente',          label: 'Inadimplente' },
            { value: 'perdido',               label: 'Perdido' },
          ]} />
          <Textarea label="Observações" placeholder="Observações sobre este lead..." rows={2} />
          <Button variant="primary" className="w-full">Salvar lead</Button>
        </div>
      </Modal>
    </div>
  );
}
