import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, MessageCircle, Mail, Phone, Tag, Users, ArrowRight,
  Eye, Pencil, SlidersHorizontal, Columns2, X, ChevronDown,
  CreditCard, MapPin, Star, ShoppingBag, Repeat, Calendar, TrendingUp,
  Loader2,
} from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select, Textarea, SectionHeader,
  SearchBar, Tabs, Pagination,
} from '../../components/ui';
import { getLeads, getHistoricoEtapaLead, deleteHistoricoEtapaLead, deleteHistoricoEtapaItem } from '../../services/leads.service';
import { getClientes, updateCliente } from '../../services/clientes.service';
import { getPedidos } from '../../services/pedidos.service';
import { getAssinaturasCliente } from '../../services/assinaturas.service';
import { getReservasCliente } from '../../services/reservas.service';
import type { Lead, LeadEtapa, Cliente, Pedido, Assinatura, Reserva, HistoricoEtapaLead } from '../../types';

// ── Etapas do funil ───────────────────────────────────────────────────────────

const etapas: { id: LeadEtapa; label: string; color: string }[] = [
  { id: 'novo',                  label: 'Novo Lead',            color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { id: 'interesse_assinatura',  label: 'Interesse Assinatura', color: 'bg-gold-100 text-gold-700 border-gold-200'       },
  { id: 'checkout_iniciado',     label: 'Checkout Iniciado',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'assinatura_concluida',  label: 'Assinatura Concluída', color: 'bg-forest-100 text-forest-700 border-forest-200' },
  { id: 'interesse_reserva',     label: 'Interesse Reserva',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'cliente_ativo',         label: 'Cliente Ativo',        color: 'bg-forest-100 text-forest-700 border-forest-200' },
  { id: 'inadimplente',          label: 'Inadimplente',         color: 'bg-red-100 text-red-700 border-red-200'          },
  { id: 'recuperacao',           label: 'Recuperação',          color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'perdido',               label: 'Perdido',              color: 'bg-charcoal-100 text-charcoal-600 border-charcoal-200' },
];

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const etapa = etapas.find(e => e.id === lead.etapa);
  const origemIcon: Record<string, string> = {
    checkout: '🛒', reserva: '📅', manual: '✍️', blog: '📝', social: '📱', indicacao: '👥', landing: '🎯',
  };
  return (
    <div onClick={onClick} className="bg-white rounded-sm border border-cream-200 p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-charcoal-700 text-sm">{lead.nome}</p>
          <p className="text-xs text-charcoal-400">{lead.email}</p>
        </div>
        <span className="text-sm">{origemIcon[lead.origem] || '📋'}</span>
      </div>
      {lead.planoDesejado && <p className="text-xs text-forest-600 mb-2">→ {lead.planoDesejado}</p>}
      <div className="flex flex-wrap gap-1 mb-3">
        {lead.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded border border-cream-200">{tag}</span>
        ))}
      </div>
      {lead.proximoFollowUp && (
        <p className="text-xs text-charcoal-400">Follow-up: {new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR')}</p>
      )}
      <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded border ${etapa?.color}`}>{etapa?.label}</span>
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

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminCRM() {
  // ── Leads ──────────────────────────────────────────────────────────────────
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [tab, setTab]                   = useState('funil');
  const [search, setSearch]             = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [novoModal, setNovoModal]       = useState(false);

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
    // Limpa cache de histórico ao trocar de cliente
    setLeadHistorico({});
    setLeadHistLoading({});
    Promise.all([
      getPedidos(selectedCliente.id),
      getAssinaturasCliente(selectedCliente.id),
      getReservasCliente(selectedCliente.id),
    ]).then(([pedidos, assinaturas, reservas]) => {
      setCliHist({ pedidos, assinaturas, reservas, loading: false });
    }).catch(() => {
      setCliHist(prev => ({ ...prev, loading: false }));
    });
  }, [selectedCliente?.id]);

  useEffect(() => {
    getLeads().then(setLeads).catch(console.error);
    getClientes().then(setClientes).catch(console.error);
  }, []);

  // ── Filtros leads ──────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l =>
    search === '' ||
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  );
  const leadsPorEtapa = (etapa: LeadEtapa) => filteredLeads.filter(l => l.etapa === etapa);

  // Leads vinculados ao cliente selecionado (derivado fora do modal)
  const clienteLeadsAtual = selectedCliente
    ? leads.filter(l => l.clienteId === selectedCliente.id || l.email === selectedCliente.email)
    : [];

  // Carrega histórico de etapas quando aba funil é aberta
  useEffect(() => {
    if (cliDetalheTab !== 'funil' || clienteLeadsAtual.length === 0) return;
    clienteLeadsAtual.forEach(l => carregarHistoricoLead(l.id));
  }, [cliDetalheTab, selectedCliente?.id]);

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
        tipoMoagem: formCli.preferenciaCafe === 'moido' ? formCli.tipoMoagem || undefined : undefined,
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
        ]}
        active={tab}
        onChange={setTab}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar leads..." className="max-w-md" />

      {/* ── FUNIL ─────────────────────────────────────────────────────────── */}
      {tab === 'funil' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {etapas.slice(0, 6).map(etapa => {
              const etapaLeads = leadsPorEtapa(etapa.id);
              return (
                <div key={etapa.id} className="w-64 shrink-0">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-sm border mb-3 ${etapa.color}`}>
                    <span className="text-xs font-medium">{etapa.label}</span>
                    <span className="text-xs font-bold">{etapaLeads.length}</span>
                  </div>
                  <div className="space-y-3 min-h-24">
                    {etapaLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                    ))}
                    {etapaLeads.length === 0 && (
                      <div className="flex items-center justify-center h-16 border-2 border-dashed border-cream-300 rounded-sm text-xs text-charcoal-300">
                        Nenhum lead
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LISTA DE LEADS ────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Nome</th>
                  <th className="table-th">Contato</th>
                  <th className="table-th">Origem</th>
                  <th className="table-th">Etapa</th>
                  <th className="table-th">Plano</th>
                  <th className="table-th">Follow-up</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const etapa = etapas.find(e => e.id === lead.etapa);
                  return (
                    <tr key={lead.id} className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      <td className="table-td font-medium text-charcoal-700">{lead.nome}</td>
                      <td className="table-td">
                        <p className="text-sm text-charcoal-600">{lead.email}</p>
                        <p className="text-xs text-charcoal-400">{lead.telefone}</p>
                      </td>
                      <td className="table-td text-charcoal-500 capitalize">{lead.origem}</td>
                      <td className="table-td">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${etapa?.color}`}>{etapa?.label}</span>
                      </td>
                      <td className="table-td text-charcoal-500">{lead.planoDesejado || '—'}</td>
                      <td className="table-td text-charcoal-500">
                        {lead.proximoFollowUp ? new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
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
            <SearchBar value={clienteSearch} onChange={v => { setClienteSearch(v); setClientePage(1); }} placeholder="Nome, e-mail, telefone ou CPF…" className="w-64" />

            {/* Filtros */}
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

            {/* Colunas */}
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
                  <tr><td colSpan={colunasVis.size + 1} className="table-td text-center text-charcoal-400 py-10">Nenhum cliente encontrado.</td></tr>
                ) : paginatedCli.map(cli => (
                  <tr key={cli.id} className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors" onClick={() => setSelectedCliente(cli)}>
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
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setSelectedCliente(cli); }} className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors" title="Ver cadastro">
                          <Eye size={15} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelectedCliente(cli); abrirEditarCliente(cli); }} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm transition-colors" title="Editar">
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={clientePage} total={filteredCli.length} perPage={perPageCli} onChange={setClientePage} />
        </Card>
      )}

      {/* ── Modal detalhe lead ─────────────────────────────────────────────── */}
      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.nome ?? ''} size="lg">
        {selectedLead && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'E-mail',        value: selectedLead.email },
                { label: 'Telefone',      value: selectedLead.telefone },
                { label: 'Origem',        value: selectedLead.origem },
                { label: 'Plano desejado', value: selectedLead.planoDesejado || '—' },
              ].map(info => (
                <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                  <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                  <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Etapa do funil</p>
              <Select value={selectedLead.etapa} onChange={() => {}} options={etapas.map(e => ({ value: e.id, label: e.label }))} />
            </div>
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {selectedLead.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-cream-100 border border-cream-200 text-sm text-charcoal-600 rounded-full"><Tag size={12} />{tag}</span>
                ))}
              </div>
            </div>
            {selectedLead.observacoes && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Observações</p>
                <p className="text-sm text-charcoal-600 bg-cream-50 rounded-sm p-3">{selectedLead.observacoes}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Histórico de interações ({selectedLead.interacoes.length})</p>
              {selectedLead.interacoes.length === 0 ? (
                <p className="text-sm text-charcoal-400">Nenhuma interação registrada.</p>
              ) : (
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
              )}
            </div>
            <div className="flex gap-3 pt-2 border-t border-cream-200">
              <Button variant="primary" size="sm"><MessageCircle size={14} />Enviar WhatsApp</Button>
              <Button variant="secondary" size="sm"><Mail size={14} />Enviar e-mail</Button>
              {!selectedLead.clienteId && <Button variant="ghost" size="sm"><ArrowRight size={14} />Converter em cliente</Button>}
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
            entregue: 'bg-forest-100 text-forest-700', cancelado: 'bg-red-100 text-red-700',
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
                              {lead.planoDesejado && <span>Plano: <strong className="text-charcoal-700">{lead.planoDesejado}</strong></span>}
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
                                  {/* Linha vertical da timeline */}
                                  <div className="absolute left-[13px] top-0 bottom-0 w-px bg-cream-300" />
                                  <div className="space-y-0">
                                    {hist.map((h, idx) => {
                                      const etAnterior = etapas.find(e => e.id === h.etapaAnterior);
                                      const etNova     = etapas.find(e => e.id === h.etapaNova);
                                      const isFirst    = idx === 0;
                                      return (
                                        <div key={h.id} className="flex gap-3 group">
                                          {/* Bolinha */}
                                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border-2 ${isFirst ? 'bg-forest-500 border-forest-500' : 'bg-white border-cream-300'}`}>
                                            <TrendingUp size={11} className={isFirst ? 'text-white' : 'text-charcoal-400'} />
                                          </div>
                                          {/* Conteúdo */}
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
                                            <p className="text-[10px] text-charcoal-400 mt-0.5">
                                              {new Date(h.alteradoEm).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                              {' às '}
                                              {new Date(h.alteradoEm).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                                              {h.alteradoPor ? ` · por ${h.alteradoPor}` : ''}
                                            </p>
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

      {/* ── Modal novo lead ────────────────────────────────────────────────── */}
      <Modal open={novoModal} onClose={() => setNovoModal(false)} title="Novo Lead" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" placeholder="Nome completo" />
            <Input label="E-mail" type="email" placeholder="email@exemplo.com" />
          </div>
          <Input label="Telefone" placeholder="(11) 99999-9999" />
          <Select label="Origem" options={[
            { value: 'manual', label: 'Manual' },
            { value: 'social', label: 'Redes Sociais' },
            { value: 'indicacao', label: 'Indicação' },
            { value: 'landing', label: 'Landing Page' },
          ]} />
          <Textarea label="Observações" placeholder="Observações sobre este lead..." rows={2} />
          <Button variant="primary" className="w-full">Salvar lead</Button>
        </div>
      </Modal>
    </div>
  );
}
