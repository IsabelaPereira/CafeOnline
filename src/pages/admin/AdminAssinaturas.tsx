import { useEffect, useState, useRef } from 'react';
import { Eye, RefreshCw, AlertTriangle, Copy, ExternalLink, Plus, Pause, Play, XCircle, RotateCcw, CreditCard, Calendar, SlidersHorizontal, Columns2, X, ChevronDown, Coffee, Package, TrendingUp, ArrowRight, Tag, Loader2, Mail, MessageSquare, Phone, FileText, Truck } from 'lucide-react';
import {
  Card, Badge, SearchBar, Pagination,
  Modal, Button, SectionHeader, StatCard, Tabs, Input
} from '../../components/ui';
import { getAssinaturas, getPlanos, updatePlano, createPlano, manageAssinatura, updatePreferenciaAssinatura, criarPedidoManualAssinatura, alterarFormaEntregaAssinatura } from '../../services/assinaturas.service';
import { getEdicoes } from '../../services/edicoes.service';
import { getLeadByEmail, getLeadByClienteId, getHistoricoEtapaLead, updateLeadCheckout } from '../../services/leads.service';
import { createCheckoutSession } from '../../services/stripe.service';
import { calcularFrete, RETIRADA_OPCAO } from '../../services/frete.service';
import { supabase } from '../../lib/supabase';
import type { Assinatura, PlanoAssinatura, EdicaoClube, Lead, LeadEtapa, HistoricoEtapaLead } from '../../types';
import type { FreteOpcao } from '../../services/frete.service';

// ── Mapa de etapas (labels + cores) ──────────────────────────────────────────
const ETAPAS_MAP: Record<string, { label: string; color: string }> = {
  novo:                   { label: 'Novo Lead',              color: 'bg-blue-100 text-blue-700 border-blue-200'        },
  interesse_assinatura:   { label: 'Interesse Assinatura',   color: 'bg-gold-100 text-gold-700 border-gold-200'        },
  checkout_plano:         { label: 'Checkout: Plano',        color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  checkout_contato:       { label: 'Checkout: Contato',      color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  checkout_preferencias:  { label: 'Checkout: Preferências', color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  checkout_endereco:      { label: 'Checkout: Endereço',     color: 'bg-amber-100 text-amber-700 border-amber-200'     },
  checkout_pagamento:     { label: 'Checkout: Pagamento',    color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  checkout_iniciado:      { label: 'Checkout Iniciado',      color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  pagamento_iniciado:     { label: 'Pagamento Iniciado',     color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  pagamento_invalido:     { label: 'Pagamento Inválido',     color: 'bg-red-100 text-red-700 border-red-200'           },
  pagamento_pendente:     { label: 'Pagamento Pendente',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200'  },
  assinatura_concluida:   { label: 'Assinatura Concluída',   color: 'bg-forest-100 text-forest-700 border-forest-200'  },
  assinatura_cancelada:   { label: 'Assinatura Cancelada',  color: 'bg-red-100 text-red-700 border-red-200'            },
  compra_concluida:       { label: 'Compra Concluída',      color: 'bg-blue-100 text-blue-700 border-blue-200'         },
  interesse_reserva:      { label: 'Interesse Reserva',      color: 'bg-purple-100 text-purple-700 border-purple-200'  },
  cliente_ativo:          { label: 'Cliente Ativo',          color: 'bg-forest-100 text-forest-700 border-forest-200'  },
  inadimplente:           { label: 'Inadimplente',           color: 'bg-red-100 text-red-700 border-red-200'           },
  recuperacao:            { label: 'Recuperação',            color: 'bg-yellow-100 text-yellow-700 border-yellow-200'  },
  perdido:                { label: 'Perdido',                color: 'bg-charcoal-100 text-charcoal-600 border-charcoal-200' },
};

const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive'> = {
  ativa: 'active', pendente: 'pending', inadimplente: 'cancelled', cancelada: 'inactive', pausada: 'inactive',
};

// ── Filtro dinâmico ───────────────────────────────────────────────────────────

interface FiltroAtivo { id: string; campo: string; operador: string; valor: string }

const CAMPOS_FILTRO = [
  { value: 'clienteNome',          label: 'Cliente',         tipo: 'texto'       },
  { value: 'clienteEmail',         label: 'E-mail',          tipo: 'texto'       },
  { value: 'clienteTelefone',      label: 'Telefone',        tipo: 'texto'       },
  { value: 'plano',                label: 'Plano',           tipo: 'plano'       },
  { value: 'status',               label: 'Status',          tipo: 'status'      },
  { value: 'totalMensal',          label: 'Total Mensal',    tipo: 'numero'      },
  { value: 'frete',                label: 'Frete',           tipo: 'numero'      },
  { value: 'proximaCobranca',      label: 'Próx. Cobrança',  tipo: 'data'        },
  { value: 'proximoEnvio',         label: 'Próx. Envio',     tipo: 'data'        },
  { value: 'dataInicio',           label: 'Data Início',     tipo: 'data'        },
  { value: 'preferenciaCafe',      label: 'Preferência',     tipo: 'preferencia' },
  { value: 'stripeSubscriptionId', label: 'ID Stripe',       tipo: 'texto'       },
];

const OPERADORES: Record<string, { value: string; label: string }[]> = {
  texto:      [{ value: 'contem', label: 'contém' }, { value: 'nao_contem', label: 'não contém' }, { value: 'igual', label: 'é igual a' }, { value: 'comeca', label: 'começa com' }],
  numero:     [{ value: 'igual', label: '=' }, { value: 'maior', label: '>' }, { value: 'menor', label: '<' }, { value: 'maiorIgual', label: '>=' }, { value: 'menorIgual', label: '<=' }],
  data:       [{ value: 'igual', label: 'é' }, { value: 'antes', label: 'antes de' }, { value: 'depois', label: 'depois de' }],
  status:     [{ value: 'igual', label: 'é' }, { value: 'diferente', label: 'não é' }],
  plano:      [{ value: 'igual', label: 'é' }, { value: 'diferente', label: 'não é' }],
  preferencia:[{ value: 'igual', label: 'é' }, { value: 'diferente', label: 'não é' }],
};

const STATUS_OPCOES   = ['ativa', 'pendente', 'inadimplente', 'cancelada', 'pausada'];
const PREFER_OPCOES   = [{ value: 'grao', label: 'Grão' }, { value: 'moido', label: 'Moído' }];

const COLUNAS_DEF = [
  { id: 'cliente',         label: 'Cliente',        padrao: true  },
  { id: 'plano',           label: 'Plano',          padrao: true  },
  { id: 'totalMensal',     label: 'Total Mensal',   padrao: true  },
  { id: 'proximaCobranca', label: 'Próx. Cobrança', padrao: true  },
  { id: 'proximoEnvio',    label: 'Próx. Envio',    padrao: true  },
  { id: 'preferencia',     label: 'Preferência',    padrao: true  },
  { id: 'status',          label: 'Status',         padrao: true  },
  { id: 'stripeId',        label: 'ID Stripe',      padrao: false },
  { id: 'dataInicio',      label: 'Data Início',    padrao: false },
  { id: 'frete',           label: 'Frete',          padrao: false },
];

function matchTexto(t: string, op: string, v: string) {
  if (op === 'contem')     return t.includes(v);
  if (op === 'nao_contem') return !t.includes(v);
  if (op === 'igual')      return t === v;
  if (op === 'comeca')     return t.startsWith(v);
  return true;
}
function matchNumero(n: number, op: string, v: string) {
  const num = parseFloat(v); if (isNaN(num)) return true;
  if (op === 'igual')      return n === num;
  if (op === 'maior')      return n > num;
  if (op === 'menor')      return n < num;
  if (op === 'maiorIgual') return n >= num;
  if (op === 'menorIgual') return n <= num;
  return true;
}
function matchData(d: string, op: string, v: string) {
  if (!d || !v) return true;
  const dt = new Date(d).getTime(), dv = new Date(v).getTime();
  if (isNaN(dt) || isNaN(dv)) return true;
  if (op === 'igual')  return d.startsWith(v);
  if (op === 'antes')  return dt < dv;
  if (op === 'depois') return dt > dv;
  return true;
}
function matchFiltro(a: import('../../types').Assinatura, f: FiltroAtivo): boolean {
  if (!f.valor.trim()) return true;
  const v = f.valor.toLowerCase().trim();
  switch (f.campo) {
    case 'clienteNome':          return matchTexto((a.clienteNome ?? '').toLowerCase(), f.operador, v);
    case 'clienteEmail':         return matchTexto((a.clienteEmail ?? '').toLowerCase(), f.operador, v);
    case 'clienteTelefone':      return matchTexto((a.clienteTelefone ?? '').toLowerCase(), f.operador, v);
    case 'plano':                return f.operador === 'diferente' ? a.plano.nome !== f.valor : a.plano.nome === f.valor;
    case 'status':               return f.operador === 'diferente' ? a.status !== f.valor : a.status === f.valor;
    case 'preferenciaCafe':      return f.operador === 'diferente' ? a.preferenciaCafe !== f.valor : a.preferenciaCafe === f.valor;
    case 'totalMensal':          return matchNumero(a.totalMensal, f.operador, f.valor);
    case 'frete':                return matchNumero(a.frete, f.operador, f.valor);
    case 'proximaCobranca':      return matchData(a.proximaCobranca, f.operador, f.valor);
    case 'proximoEnvio':         return matchData(a.proximoEnvio, f.operador, f.valor);
    case 'dataInicio':           return matchData(a.dataInicio, f.operador, f.valor);
    case 'stripeSubscriptionId': return matchTexto((a.stripeSubscriptionId ?? '').toLowerCase(), f.operador, v);
    default: return true;
  }
}

export function AdminAssinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [planos, setPlanos] = useState<PlanoAssinatura[]>([]);
  const [tab, setTab] = useState('assinantes');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Assinatura | null>(null);
  const [reprocessando, setReprocessando] = useState<string | null>(null);
  const [linkPagamento, setLinkPagamento] = useState<string | null>(null);
  const [editandoPlano, setEditandoPlano] = useState<PlanoAssinatura | null>(null);
  const [criandoPlano, setCriandoPlano] = useState(false);
  const [formPlano, setFormPlano] = useState({ nome: '', descricao: '', preco: '', beneficios: '' as string, ativo: true, destaque: false, ordem: 0, stripePriceId: '' });
  const [salvandoPlano, setSalvandoPlano] = useState(false);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<{ tipo: 'agendado' | 'imediato' } | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  // Preferência
  const [editandoPreferencia, setEditandoPreferencia] = useState(false);
  const [formPreferencia, setFormPreferencia] = useState<{ preferenciaCafe: 'grao' | 'moido'; tipoMoagem: string }>({ preferenciaCafe: 'grao', tipoMoagem: '' });
  const [salvandoPreferencia, setSalvandoPreferencia] = useState(false);
  // Forma de entrega
  const [editandoEntrega, setEditandoEntrega]         = useState(false);
  const [formEntrega, setFormEntrega]                 = useState<'entrega' | 'retirada'>('retirada');
  const [freteOpcoesEntrega, setFreteOpcoesEntrega]   = useState<FreteOpcao[]>([]);
  const [freteSelecionadoId, setFreteSelecionadoId]   = useState('');
  const [calculandoFrete, setCalculandoFrete]         = useState(false);
  const [salvandoEntrega, setSalvandoEntrega]         = useState(false);
  // Pedido manual
  const [criandoPedidoManual, setCriandoPedidoManual] = useState(false);
  const [edicoes, setEdicoes] = useState<EdicaoClube[]>([]);
  const [formPedidoManual, setFormPedidoManual] = useState({ mes: String(new Date().getMonth() + 1), ano: String(new Date().getFullYear()), edicaoId: '' });
  const [salvandoPedidoManual, setSalvandoPedidoManual] = useState(false);
  // ── Aba do detalhe da assinatura ──────────────────────────────────────────
  const [assDetalheTab, setAssDetalheTab] = useState<'assinatura' | 'lead'>('assinatura');
  const [assLead, setAssLead]             = useState<Lead | null>(null);
  const [assLeadHist, setAssLeadHist]     = useState<HistoricoEtapaLead[]>([]);
  const [assLeadLoading, setAssLeadLoading] = useState(false);

  const [filtrosAtivos, setFiltrosAtivos] = useState<FiltroAtivo[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarColunas, setMostrarColunas] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState<Set<string>>(
    () => new Set(COLUNAS_DEF.filter(c => c.padrao).map(c => c.id))
  );
  const colunasRef = useRef<HTMLDivElement>(null);
  const perPage = 10;

  function adicionarFiltro() {
    setFiltrosAtivos(prev => [...prev, { id: crypto.randomUUID(), campo: 'clienteNome', operador: 'contem', valor: '' }]);
    setMostrarFiltros(true);
  }
  function removerFiltro(id: string) { setFiltrosAtivos(prev => prev.filter(f => f.id !== id)); }
  function atualizarFiltro(id: string, patch: Partial<FiltroAtivo>) {
    setFiltrosAtivos(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }
  function tiposCampo(campo: string) { return CAMPOS_FILTRO.find(c => c.value === campo)?.tipo ?? 'texto'; }
  function toggleColuna(id: string) {
    setColunasVisiveis(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function abrirEditarPlano(plano: PlanoAssinatura) {
    setFormPlano({ nome: plano.nome, descricao: plano.descricao ?? '', preco: String(plano.preco), beneficios: plano.beneficios.join('\n'), ativo: plano.ativo, destaque: plano.destaque ?? false, ordem: plano.ordem, stripePriceId: plano.stripePriceId ?? '' });
    setEditandoPlano(plano);
  }

  function abrirNovoPano() {
    setFormPlano({ nome: '', descricao: '', preco: '', beneficios: '', ativo: true, destaque: false, ordem: planos.length + 1, stripePriceId: '' });
    setCriandoPlano(true);
  }

  function parsedFormPlano() {
    return {
      nome: formPlano.nome.trim(),
      descricao: formPlano.descricao.trim(),
      preco: parseFloat(formPlano.preco) || 0,
      beneficios: formPlano.beneficios.split('\n').map(b => b.trim()).filter(Boolean),
      ativo: formPlano.ativo,
      destaque: formPlano.destaque,
      ordem: formPlano.ordem,
      stripePriceId: formPlano.stripePriceId.trim() || undefined,
    };
  }

  async function handleSalvarPlano() {
    if (!editandoPlano) return;
    setSalvandoPlano(true);
    try {
      const patch = parsedFormPlano();
      await updatePlano(editandoPlano.id, patch);
      setPlanos(prev => prev.map(p => p.id === editandoPlano.id ? { ...p, ...patch } : p));
      setEditandoPlano(null);
    } catch {
      alert('Erro ao salvar plano. Tente novamente.');
    } finally {
      setSalvandoPlano(false);
    }
  }

  async function handleCriarPlano() {
    setSalvandoPlano(true);
    try {
      const novo = await createPlano(parsedFormPlano());
      setPlanos(prev => [...prev, novo]);
      setCriandoPlano(false);
    } catch {
      alert('Erro ao criar plano. Tente novamente.');
    } finally {
      setSalvandoPlano(false);
    }
  }

  // Busca o lead ao abrir o modal de assinatura
  useEffect(() => {
    if (!selected) { setAssLead(null); setAssLeadHist([]); setAssDetalheTab('assinatura'); return; }
    const email = selected.clienteEmail;
    if (!email) return;
    setAssLeadLoading(true);
    getLeadByEmail(email)
      .then(async lead => {
        setAssLead(lead);
        if (lead) {
          const hist = await getHistoricoEtapaLead(lead.id).catch(() => []);
          setAssLeadHist(hist);
        }
      })
      .finally(() => setAssLeadLoading(false));
  }, [selected?.id]);

  async function handleGerarLinkPagamento(assinatura: Assinatura) {
    setReprocessando(assinatura.id);
    try {
      const { url } = await createCheckoutSession({
        items: [{
          name:   `Assinatura ${assinatura.plano.nome} — mensal`,
          amount: assinatura.totalMensal,
        }],
        mode:          'subscription',
        successPath:   `/sucesso?tipo=assinatura&id=${assinatura.id}`,
        cancelPath:    `/cliente/assinaturas`,
        metadata:      { assinatura_id: assinatura.id, cliente_id: assinatura.clienteId },
        customerEmail: assinatura.clienteEmail ?? undefined,
      });
      setSelected(null);
      setLinkPagamento(url);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao gerar link de pagamento.');
    } finally {
      setReprocessando(null);
    }
  }

  async function handleReprocessar(assinaturaId: string) {
    setReprocessando(assinaturaId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? supabaseKey;

      const res = await fetch(`${supabaseUrl}/functions/v1/retry-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ assinatura_id: assinaturaId }),
      });
      const json = await res.json();
      if (json.url) {
        setSelected(null);
        setLinkPagamento(json.url);
      } else {
        alert(`Erro ao gerar link: ${json.error ?? 'Erro desconhecido'}`);
      }
    } catch {
      alert('Erro ao contatar o servidor. Tente novamente.');
    } finally {
      setReprocessando(null);
    }
  }

  async function handleAcao(acao: string, assinaturaId: string, motivo?: string) {
    setAcaoEmAndamento(acao);
    try {
      const result = await manageAssinatura(assinaturaId, acao as Parameters<typeof manageAssinatura>[1], motivo);
      if (result.error) {
        alert(`Erro: ${result.error}`);
        return;
      }
      if (result.url) {
        // billing_portal
        window.open(result.url, '_blank');
        return;
      }

      // Após cancelamento, atualizar lead com etapa 'assinatura_cancelada' e follow-up em 15min
      if (acao === 'cancel_now' || acao === 'cancel_at_period_end') {
        const assinaturaAtual = assinaturas.find(a => a.id === assinaturaId);
        if (assinaturaAtual) {
          const lead = assinaturaAtual.clienteId
            ? await getLeadByClienteId(assinaturaAtual.clienteId).catch(() => null)
            : assinaturaAtual.clienteEmail
            ? await getLeadByEmail(assinaturaAtual.clienteEmail).catch(() => null)
            : null;
          if (lead) {
            const followUp = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            await updateLeadCheckout(lead.id, {
              etapa: 'assinatura_cancelada',
              proximoFollowUp: followUp,
              observacoes: motivo ? `Cancelamento: ${motivo}` : undefined,
            }).catch(() => {});
          }
        }
      }

      // Recarregar lista
      const updated = await getAssinaturas();
      setAssinaturas(updated);
      const updatedSelected = updated.find(a => a.id === assinaturaId) ?? null;
      setSelected(updatedSelected);
      setConfirmCancelar(null);
      setMotivoCancelamento('');
    } catch {
      alert('Erro ao executar ação. Tente novamente.');
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  async function handleSalvarPreferencia() {
    if (!selected) return;
    setSalvandoPreferencia(true);
    try {
      await updatePreferenciaAssinatura(
        selected.id,
        formPreferencia.preferenciaCafe,
        formPreferencia.preferenciaCafe === 'moido' ? formPreferencia.tipoMoagem || undefined : undefined,
      );
      const updated = await getAssinaturas();
      setAssinaturas(updated);
      const updatedSelected = updated.find(a => a.id === selected.id) ?? null;
      setSelected(updatedSelected);
      setEditandoPreferencia(false);
    } catch {
      alert('Erro ao salvar preferência.');
    } finally {
      setSalvandoPreferencia(false);
    }
  }

  function abrirEditarEntrega() {
    if (!selected) return;
    setFormEntrega(selected.formaEntrega);
    if (selected.formaEntrega === 'retirada') {
      setFreteOpcoesEntrega([RETIRADA_OPCAO]);
      setFreteSelecionadoId('retirada');
    } else {
      setFreteOpcoesEntrega([]);
      setFreteSelecionadoId('');
    }
    setEditandoEntrega(true);
  }

  async function handleCalcularFreteEntrega() {
    if (!selected) return;
    setCalculandoFrete(true);
    try {
      const opcoes = await calcularFrete(selected.endereco.cep);
      setFreteOpcoesEntrega(opcoes);
      if (opcoes.length > 0) setFreteSelecionadoId(opcoes[0].id);
    } catch {
      alert('Erro ao calcular frete. Confira o CEP do endereço da assinatura.');
    } finally {
      setCalculandoFrete(false);
    }
  }

  async function handleSalvarFormaEntrega() {
    if (!selected) return;
    const freteEscolhido = formEntrega === 'retirada'
      ? 0
      : freteOpcoesEntrega.find(f => f.id === freteSelecionadoId)?.preco;
    if (formEntrega === 'entrega' && freteEscolhido === undefined) {
      alert('Calcule e selecione uma opção de frete antes de salvar.');
      return;
    }
    setSalvandoEntrega(true);
    try {
      const result = await alterarFormaEntregaAssinatura(selected.id, formEntrega, freteEscolhido ?? 0);
      if (result.error) { alert(result.error); return; }
      const updated = await getAssinaturas();
      setAssinaturas(updated);
      const updatedSelected = updated.find(a => a.id === selected.id) ?? null;
      setSelected(updatedSelected);
      setEditandoEntrega(false);
    } catch {
      alert('Erro ao alterar forma de entrega.');
    } finally {
      setSalvandoEntrega(false);
    }
  }

  async function handleCriarPedidoManual() {
    if (!selected) return;
    const mes = parseInt(formPedidoManual.mes);
    const ano = parseInt(formPedidoManual.ano);
    if (!mes || !ano) { alert('Informe mês e ano válidos.'); return; }
    setSalvandoPedidoManual(true);
    try {
      await criarPedidoManualAssinatura(
        selected.id,
        mes,
        ano,
        formPedidoManual.edicaoId || undefined,
      );
      setCriandoPedidoManual(false);
      alert(`Pedido DM-${ano}${String(mes).padStart(2, '0')} criado com sucesso.`);
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    } finally {
      setSalvandoPedidoManual(false);
    }
  }

  useEffect(() => {
    getAssinaturas().then(setAssinaturas).catch(console.error);
    getPlanos().then(setPlanos).catch(console.error);
    getEdicoes().then(setEdicoes).catch(console.error);
  }, []);

  const filtered = assinaturas.filter(a => {
    const termo = search.toLowerCase();
    const matchSearch = search === ''
      || (a.clienteNome ?? '').toLowerCase().includes(termo)
      || (a.clienteEmail ?? '').toLowerCase().includes(termo)
      || a.plano.nome.toLowerCase().includes(termo);
    const matchDinamico = filtrosAtivos.every(f => matchFiltro(a, f));
    return matchSearch && matchDinamico;
  });

  const ativas = assinaturas.filter(a => a.status === 'ativa').length;
  const inadimplentes = assinaturas.filter(a => a.status === 'inadimplente').length;
  const canceladas = assinaturas.filter(a => a.status === 'cancelada').length;
  const receitaMensal = assinaturas.filter(a => a.status === 'ativa').reduce((acc, a) => acc + a.totalMensal, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Assinaturas"
        subtitle="Gestão de assinantes e planos"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Assinantes Ativos" value={ativas} color="forest" icon={<></>} />
        <StatCard title="Inadimplentes" value={inadimplentes} color="red" icon={<AlertTriangle size={18} />} />
        <StatCard title="Canceladas" value={canceladas} color="earth" icon={<></>} />
        <StatCard title="MRR" value={`R$ ${receitaMensal.toFixed(0)}`} subtitle="Receita recorrente mensal" color="gold" icon={<></>} />
      </div>

      <Tabs
        tabs={[
          { id: 'assinantes', label: 'Assinantes', count: assinaturas.length },
          { id: 'planos', label: 'Planos', count: planos.length },
          { id: 'edicoes', label: 'Edições do Clube' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'assinantes' && (
        <Card padding={false}>

          {/* ── Barra de ferramentas ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-cream-100">
            <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Busca rápida…" className="w-56" />

            {/* Botão Filtros */}
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors ${mostrarFiltros || filtrosAtivos.length > 0 ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-cream-200 text-charcoal-500 hover:border-forest-300 hover:text-forest-600'}`}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {filtrosAtivos.length > 0 && (
                <span className="ml-0.5 bg-forest-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{filtrosAtivos.length}</span>
              )}
              <ChevronDown size={12} className={`transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
            </button>

            {/* Botão Colunas */}
            <div className="relative" ref={colunasRef}>
              <button
                onClick={() => setMostrarColunas(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors ${mostrarColunas ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-cream-200 text-charcoal-500 hover:border-forest-300 hover:text-forest-600'}`}
              >
                <Columns2 size={14} />
                Colunas
                <ChevronDown size={12} className={`transition-transform ${mostrarColunas ? 'rotate-180' : ''}`} />
              </button>
              {mostrarColunas && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-cream-200 rounded-sm shadow-lg p-3 w-48 space-y-1">
                  {COLUNAS_DEF.map(col => (
                    <label key={col.id} className="flex items-center gap-2 text-sm text-charcoal-600 cursor-pointer hover:text-charcoal-800 py-0.5">
                      <input
                        type="checkbox"
                        checked={colunasVisiveis.has(col.id)}
                        onChange={() => toggleColuna(col.id)}
                        className="w-3.5 h-3.5 accent-forest-500"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-charcoal-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
              <button onClick={() => alert('Exportando...')} className="px-3 py-1.5 text-sm border border-cream-200 rounded-sm text-charcoal-500 hover:border-forest-300 hover:text-forest-600 transition-colors">
                Exportar
              </button>
            </div>
          </div>

          {/* ── Painel de filtros dinâmicos ──────────────────────────── */}
          {mostrarFiltros && (
            <div className="px-4 py-3 bg-cream-50 border-b border-cream-100 space-y-2">
              {filtrosAtivos.length === 0 && (
                <p className="text-sm text-charcoal-400">Nenhum filtro ativo. Clique em "Adicionar filtro" para começar.</p>
              )}
              {filtrosAtivos.map(f => {
                const tipo = tiposCampo(f.campo);
                const ops  = OPERADORES[tipo] ?? OPERADORES.texto;
                return (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    {/* Campo */}
                    <select
                      value={f.campo}
                      onChange={e => atualizarFiltro(f.id, { campo: e.target.value, operador: (OPERADORES[tiposCampo(e.target.value)] ?? OPERADORES.texto)[0].value, valor: '' })}
                      className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    >
                      {CAMPOS_FILTRO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>

                    {/* Operador */}
                    <select
                      value={f.operador}
                      onChange={e => atualizarFiltro(f.id, { operador: e.target.value })}
                      className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    >
                      {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {/* Valor — varia por tipo */}
                    {tipo === 'status' ? (
                      <select value={f.valor} onChange={e => atualizarFiltro(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                        <option value="">Selecione…</option>
                        {STATUS_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : tipo === 'plano' ? (
                      <select value={f.valor} onChange={e => atualizarFiltro(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                        <option value="">Selecione…</option>
                        {planos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                      </select>
                    ) : tipo === 'preferencia' ? (
                      <select value={f.valor} onChange={e => atualizarFiltro(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                        <option value="">Selecione…</option>
                        {PREFER_OPCOES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    ) : tipo === 'data' ? (
                      <input type="date" value={f.valor} onChange={e => atualizarFiltro(f.id, { valor: e.target.value })} className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    ) : tipo === 'numero' ? (
                      <input type="number" value={f.valor} onChange={e => atualizarFiltro(f.id, { valor: e.target.value })} placeholder="0" className="w-28 px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    ) : (
                      <input type="text" value={f.valor} onChange={e => atualizarFiltro(f.id, { valor: e.target.value })} placeholder="Valor…" className="w-44 px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400" />
                    )}

                    <button onClick={() => removerFiltro(f.id)} className="p-1 text-charcoal-400 hover:text-red-500 transition-colors rounded-sm">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              <button onClick={adicionarFiltro} className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium mt-1">
                <Plus size={13} /> Adicionar filtro
              </button>
            </div>
          )}

          {/* ── Tabela dinâmica ──────────────────────────────────────── */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {colunasVisiveis.has('cliente')         && <th className="table-th">Cliente</th>}
                  {colunasVisiveis.has('plano')            && <th className="table-th">Plano</th>}
                  {colunasVisiveis.has('totalMensal')      && <th className="table-th">Total Mensal</th>}
                  {colunasVisiveis.has('frete')            && <th className="table-th">Frete</th>}
                  {colunasVisiveis.has('proximaCobranca')  && <th className="table-th">Próx. Cobrança</th>}
                  {colunasVisiveis.has('proximoEnvio')     && <th className="table-th">Próx. Envio</th>}
                  {colunasVisiveis.has('dataInicio')       && <th className="table-th">Data Início</th>}
                  {colunasVisiveis.has('preferencia')      && <th className="table-th">Preferência</th>}
                  {colunasVisiveis.has('status')           && <th className="table-th">Status</th>}
                  {colunasVisiveis.has('stripeId')         && <th className="table-th">ID Stripe</th>}
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * perPage, page * perPage).map(assin => (
                  <tr key={assin.id} className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer" onClick={() => setSelected(assin)}>
                    {colunasVisiveis.has('cliente') && (
                      <td className="table-td">
                        <p className="font-medium text-charcoal-700">{assin.clienteNome ?? '—'}</p>
                        {assin.clienteEmail && <p className="text-xs text-charcoal-400">{assin.clienteEmail}</p>}
                      </td>
                    )}
                    {colunasVisiveis.has('plano')           && <td className="table-td text-charcoal-600">{assin.plano.nome}</td>}
                    {colunasVisiveis.has('totalMensal')     && <td className="table-td font-medium text-charcoal-700">R$ {assin.totalMensal.toFixed(2)}</td>}
                    {colunasVisiveis.has('frete')           && <td className="table-td text-charcoal-500">R$ {assin.frete.toFixed(2)}</td>}
                    {colunasVisiveis.has('proximaCobranca') && <td className="table-td text-charcoal-500">{new Date(assin.proximaCobranca).toLocaleDateString('pt-BR')}</td>}
                    {colunasVisiveis.has('proximoEnvio')    && <td className="table-td text-charcoal-500">{new Date(assin.proximoEnvio).toLocaleDateString('pt-BR')}</td>}
                    {colunasVisiveis.has('dataInicio')      && <td className="table-td text-charcoal-500">{new Date(assin.dataInicio).toLocaleDateString('pt-BR')}</td>}
                    {colunasVisiveis.has('preferencia')     && (
                      <td className="table-td text-charcoal-500">
                        {assin.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${assin.tipoMoagem ?? ''})`}
                      </td>
                    )}
                    {colunasVisiveis.has('status') && (
                      <td className="table-td">
                        <Badge variant={statusVariant[assin.status]}>{assin.status}</Badge>
                      </td>
                    )}
                    {colunasVisiveis.has('stripeId') && (
                      <td className="table-td">
                        <span className="font-mono text-xs text-charcoal-400 truncate max-w-[140px] block" title={assin.stripeSubscriptionId}>
                          {assin.stripeSubscriptionId ? assin.stripeSubscriptionId.slice(0, 18) + '…' : '—'}
                        </span>
                      </td>
                    )}
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setSelected(assin); }} className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors">
                          <Eye size={15} />
                        </button>
                        {assin.status === 'pendente' && (
                          <button onClick={e => { e.stopPropagation(); handleGerarLinkPagamento(assin); }} disabled={reprocessando === assin.id} className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors disabled:opacity-50" title="Gerar link de pagamento">
                            <CreditCard size={15} />
                          </button>
                        )}
                        {assin.status === 'inadimplente' && (
                          <button onClick={e => { e.stopPropagation(); handleReprocessar(assin.id); }} disabled={reprocessando === assin.id} className="p-1.5 text-charcoal-400 hover:text-orange-500 hover:bg-orange-50 rounded-sm transition-colors disabled:opacity-50" title="Reprocessar pagamento">
                            <RefreshCw size={15} className={reprocessando === assin.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={colunasVisiveis.size + 1} className="table-td text-center text-charcoal-400 py-10">
                      Nenhum assinante encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
        </Card>
      )}

      {tab === 'planos' && (
        <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={abrirNovoPano}>
            Novo plano
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planos.map(plano => (
            <Card key={plano.id}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-serif text-xl text-charcoal-700">{plano.nome}</h3>
                <Badge variant={plano.ativo ? 'active' : 'inactive'}>
                  {plano.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="font-display text-3xl text-charcoal-700 mb-1">R$ {plano.preco}</p>
              <p className="text-sm text-charcoal-400 mb-4">/mês por assinante</p>
              <div className="flex items-center justify-between text-sm mb-3 p-3 bg-cream-50 rounded-sm">
                <span className="text-charcoal-500">Assinantes ativos</span>
                <span className="font-medium text-charcoal-700">
                  {assinaturas.filter(a => a.planoId === plano.id && a.status === 'ativa').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mb-4">
                <span className="text-charcoal-400">Cobrança recorrente</span>
                {plano.stripePriceId
                  ? <span className="text-forest-600 font-medium">✓ Configurado</span>
                  : <span className="text-amber-500">Não configurado</span>}
              </div>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => abrirEditarPlano(plano)}>Editar plano</Button>
            </Card>
          ))}
        </div>
        </div>
      )}

      {tab === 'edicoes' && (
        <Card>
          <div className="text-center py-8">
            <p className="font-serif text-xl text-charcoal-500">Edições do Clube</p>
            <p className="text-sm text-charcoal-400 mt-1">Acesse em Assinaturas → Edições do Clube no menu lateral.</p>
          </div>
        </Card>
      )}

      {/* Modal — editar plano */}
      <Modal
        open={!!editandoPlano}
        onClose={() => setEditandoPlano(null)}
        title="Editar Plano"
      >
        {editandoPlano && (
          <div className="space-y-4">
            <Input
              label="Nome do plano *"
              value={formPlano.nome}
              onChange={e => setFormPlano(p => ({ ...p, nome: e.target.value }))}
            />
            <Input
              label="Descrição"
              value={formPlano.descricao}
              onChange={e => setFormPlano(p => ({ ...p, descricao: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço mensal (R$) *"
                type="number"
                value={formPlano.preco}
                onChange={e => setFormPlano(p => ({ ...p, preco: e.target.value }))}
              />
              <Input
                label="Ordem de exibição"
                type="number"
                value={String(formPlano.ordem)}
                onChange={e => setFormPlano(p => ({ ...p, ordem: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <Input
              label="Stripe Price ID (recorrência mensal)"
              value={formPlano.stripePriceId}
              onChange={e => setFormPlano(p => ({ ...p, stripePriceId: e.target.value }))}
              placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">
                Benefícios <span className="text-charcoal-400 font-normal">(um por linha)</span>
              </label>
              <textarea
                rows={4}
                value={formPlano.beneficios}
                onChange={e => setFormPlano(p => ({ ...p, beneficios: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 placeholder-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400 resize-none"
                placeholder="Ex: 2 cafés especiais por mês&#10;Frete grátis&#10;Acesso ao conteúdo exclusivo"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formPlano.ativo}
                  onChange={e => setFormPlano(p => ({ ...p, ativo: e.target.checked }))}
                  className="w-4 h-4 accent-forest-500"
                />
                <span className="text-sm text-charcoal-600">Plano ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formPlano.destaque}
                  onChange={e => setFormPlano(p => ({ ...p, destaque: e.target.checked }))}
                  className="w-4 h-4 accent-forest-500"
                />
                <span className="text-sm text-charcoal-600">Destaque (recomendado)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
              <Button variant="ghost" onClick={() => setEditandoPlano(null)}>Cancelar</Button>
              <Button variant="primary" loading={salvandoPlano} onClick={handleSalvarPlano}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal — criar plano */}
      <Modal
        open={criandoPlano}
        onClose={() => setCriandoPlano(false)}
        title="Novo Plano"
      >
        <div className="space-y-4">
          <Input
            label="Nome do plano *"
            value={formPlano.nome}
            onChange={e => setFormPlano(p => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: Cafés da Casa"
          />
          <Input
            label="Descrição"
            value={formPlano.descricao}
            onChange={e => setFormPlano(p => ({ ...p, descricao: e.target.value }))}
            placeholder="Breve descrição exibida na página de planos"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço mensal (R$) *"
              type="number"
              value={formPlano.preco}
              onChange={e => setFormPlano(p => ({ ...p, preco: e.target.value }))}
              placeholder="0.00"
            />
            <Input
              label="Ordem de exibição"
              type="number"
              value={String(formPlano.ordem)}
              onChange={e => setFormPlano(p => ({ ...p, ordem: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <Input
            label="Stripe Price ID (recorrência mensal)"
            value={formPlano.stripePriceId}
            onChange={e => setFormPlano(p => ({ ...p, stripePriceId: e.target.value }))}
            placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1.5">
              Benefícios <span className="text-charcoal-400 font-normal">(um por linha)</span>
            </label>
            <textarea
              rows={4}
              value={formPlano.beneficios}
              onChange={e => setFormPlano(p => ({ ...p, beneficios: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 placeholder-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400 resize-none"
              placeholder={'2 cafés especiais por mês\nFrete grátis\nAcesso ao conteúdo exclusivo'}
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formPlano.ativo}
                onChange={e => setFormPlano(p => ({ ...p, ativo: e.target.checked }))}
                className="w-4 h-4 accent-forest-500"
              />
              <span className="text-sm text-charcoal-600">Plano ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formPlano.destaque}
                onChange={e => setFormPlano(p => ({ ...p, destaque: e.target.checked }))}
                className="w-4 h-4 accent-forest-500"
              />
              <span className="text-sm text-charcoal-600">Destaque (recomendado)</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setCriandoPlano(false)}>Cancelar</Button>
            <Button variant="primary" loading={salvandoPlano} icon={<Plus size={14} />} onClick={handleCriarPlano}>
              Criar plano
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal — link de pagamento gerado */}
      <Modal
        open={!!linkPagamento}
        onClose={() => setLinkPagamento(null)}
        title="Link de Pagamento Gerado"
      >
        <p className="text-sm text-charcoal-600 mb-3">
          Envie este link ao cliente para que ele possa regularizar o pagamento:
        </p>
        <div className="flex items-center gap-2 p-3 bg-cream-50 border border-cream-200 rounded-sm text-sm font-mono text-charcoal-700 break-all">
          {linkPagamento}
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={14} />}
            onClick={() => { navigator.clipboard.writeText(linkPagamento ?? ''); }}
          >
            Copiar link
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<ExternalLink size={14} />}
            onClick={() => window.open(linkPagamento ?? '', '_blank')}
          >
            Abrir link
          </Button>
        </div>
      </Modal>

      {/* Modal — confirmar cancelamento */}
      <Modal
        open={!!confirmCancelar && !!selected}
        onClose={() => { setConfirmCancelar(null); setMotivoCancelamento(''); }}
        title={confirmCancelar?.tipo === 'agendado' ? 'Cancelar ao fim do período' : 'Cancelar imediatamente'}
      >
        <div className="space-y-4">
          <p className="text-sm text-charcoal-600">
            {confirmCancelar?.tipo === 'agendado'
              ? 'A assinatura continuará ativa até o fim do período atual e não será renovada.'
              : 'A assinatura será cancelada imediatamente no Stripe. Esta ação não pode ser desfeita.'}
          </p>
          <Input
            label="Motivo do cancelamento (opcional)"
            value={motivoCancelamento}
            onChange={e => setMotivoCancelamento(e.target.value)}
            placeholder="Ex: Solicitação do cliente"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => { setConfirmCancelar(null); setMotivoCancelamento(''); }}>
              Voltar
            </Button>
            <Button
              variant="danger"
              loading={acaoEmAndamento === 'cancel_at_period_end' || acaoEmAndamento === 'cancel_now'}
              onClick={() => selected && handleAcao(
                confirmCancelar?.tipo === 'agendado' ? 'cancel_at_period_end' : 'cancel_now',
                selected.id,
                motivoCancelamento || undefined,
              )}
            >
              {confirmCancelar?.tipo === 'agendado' ? 'Confirmar agendamento' : 'Cancelar agora'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalhes da Assinatura"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">

            {/* ── Abas ── */}
            <div className="flex gap-1 border-b border-cream-200 pb-1 -mt-1">
              {[
                { id: 'assinatura', label: 'Assinatura' },
                { id: 'lead',       label: 'Lead', badge: assLead ? assLead.etapa : undefined },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setAssDetalheTab(t.id as 'assinatura' | 'lead')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
                    assDetalheTab === t.id ? 'bg-forest-500 text-white' : 'text-charcoal-500 hover:bg-cream-100'
                  }`}
                >
                  {t.label}
                  {t.badge && (
                    <span className={`text-[10px] rounded-full px-1.5 py-0 font-bold ${assDetalheTab === t.id ? 'bg-white/30 text-white' : 'bg-cream-200 text-charcoal-500'}`}>
                      {ETAPAS_MAP[t.badge]?.label ?? t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Aba: Lead ── */}
            {assDetalheTab === 'lead' && (
              assLeadLoading ? (
                <div className="flex items-center gap-2 py-6 text-charcoal-400 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Carregando lead…
                </div>
              ) : !assLead ? (
                <p className="text-sm text-charcoal-400 py-4">Nenhum lead encontrado para o e-mail <strong>{selected.clienteEmail}</strong>.</p>
              ) : (() => {
                const etapa = ETAPAS_MAP[assLead.etapa];
                return (
                  <div className="space-y-4">
                    {/* Dados */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'E-mail',            value: assLead.email },
                        { label: 'Telefone',          value: assLead.telefone || '—' },
                        { label: 'Origem',            value: assLead.origem },
                        { label: 'Interesse',         value: assLead.interesse || '—' },
                        { label: 'Plano desejado',    value: assLead.planoDesejado || '—' },
                        { label: 'Lead desde',        value: new Date(assLead.createdAt).toLocaleDateString('pt-BR') },
                        { label: 'Último contato',    value: assLead.ultimoContato ? new Date(assLead.ultimoContato + 'T00:00:00').toLocaleDateString('pt-BR') : '—' },
                        { label: 'Próximo follow-up', value: assLead.proximoFollowUp ? new Date(assLead.proximoFollowUp + 'T00:00:00').toLocaleDateString('pt-BR') : '—' },
                      ].map(info => (
                        <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                          <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                          <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Etapa */}
                    {etapa && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Etapa:</p>
                        <span className={`px-2 py-0.5 text-xs rounded border font-medium ${etapa.color}`}>{etapa.label}</span>
                      </div>
                    )}
                    {/* Tags */}
                    {assLead.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {assLead.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-cream-100 border border-cream-200 text-xs text-charcoal-600 rounded-full">
                              <Tag size={10} />{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Observações */}
                    {assLead.observacoes && (
                      <div>
                        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Observações</p>
                        <p className="text-sm text-charcoal-600 bg-cream-50 rounded-sm p-3">{assLead.observacoes}</p>
                      </div>
                    )}
                    {/* Histórico de etapas */}
                    <div className="border-t border-cream-200 pt-4">
                      <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">
                        Histórico de etapas no funil
                        {assLeadHist.length > 0 && (
                          <span className="ml-1.5 text-[10px] bg-cream-200 text-charcoal-500 rounded-full px-1.5 py-0.5">{assLeadHist.length}</span>
                        )}
                      </p>
                      {assLeadHist.length === 0 ? (
                        <p className="text-xs text-charcoal-300 italic">Nenhuma alteração de etapa registrada.</p>
                      ) : (
                        <div className="relative max-h-80 overflow-y-auto pr-1">
                          <div className="absolute left-[13px] top-0 bottom-0 w-px bg-cream-300" />
                          <div className="space-y-0">
                            {assLeadHist.map((h, idx) => {
                              const etAnterior = ETAPAS_MAP[h.etapaAnterior ?? ''];
                              const etNova     = ETAPAS_MAP[h.etapaNova];
                              const isLast     = idx === assLeadHist.length - 1;
                              return (
                                <div key={h.id} className="flex gap-3">
                                  <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border-2 ${isLast ? 'bg-forest-500 border-forest-500' : 'bg-white border-cream-300'}`}>
                                    <TrendingUp size={11} className={isLast ? 'text-white' : 'text-charcoal-400'} />
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
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
                                    <p className="text-[10px] text-charcoal-400 mb-2">
                                      {new Date(h.alteradoEm).toLocaleDateString('pt-BR')} às {new Date(h.alteradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      {h.alteradoPor ? ` · por ${h.alteradoPor}` : ''}
                                    </p>
                                    {/* Snapshot */}
                                    <div className="bg-cream-50 rounded-sm border border-cream-200 p-2.5 space-y-1.5">
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {h.origem && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Origem:</span> {h.origem}</p>}
                                        {h.interesse && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Interesse:</span> {h.interesse}</p>}
                                        {h.planoDesejado && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Plano:</span> {h.planoDesejado}</p>}
                                        {h.ultimoContato && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Último contato:</span> {new Date(h.ultimoContato + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                                        {h.proximoFollowUp && <p className="text-[10px] text-charcoal-500"><span className="text-charcoal-400">Follow-up:</span> {new Date(h.proximoFollowUp + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                                      </div>
                                      {h.tags && h.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                          {h.tags.map(tag => <span key={tag} className="px-1.5 py-0.5 bg-cream-200 text-charcoal-500 text-[10px] rounded">{tag}</span>)}
                                        </div>
                                      )}
                                      {h.observacoes && (
                                        <p className="text-[10px] text-charcoal-600 italic border-t border-cream-300 pt-1.5 mt-1">{h.observacoes}</p>
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

                    {/* Interações CRM */}
                    {assLead.interacoes.length > 0 && (
                      <div className="border-t border-cream-200 pt-4">
                        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">
                          Interações
                          <span className="ml-1.5 text-[10px] bg-cream-200 text-charcoal-500 rounded-full px-1.5 py-0.5">{assLead.interacoes.length}</span>
                        </p>
                        <div className="space-y-3">
                          {assLead.interacoes.map(inter => {
                            const interIcon = inter.tipo === 'email'
                              ? { icon: <Mail size={13} />, bg: 'bg-blue-100 text-blue-500' }
                              : inter.tipo === 'whatsapp'
                              ? { icon: <MessageSquare size={13} />, bg: 'bg-green-100 text-green-500' }
                              : inter.tipo === 'ligacao'
                              ? { icon: <Phone size={13} />, bg: 'bg-charcoal-100 text-charcoal-500' }
                              : { icon: <FileText size={13} />, bg: 'bg-amber-100 text-amber-600' };
                            return (
                              <div key={inter.id} className="flex gap-3 p-3 bg-cream-50 rounded-sm border border-cream-100">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${interIcon.bg}`}>
                                  {interIcon.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-charcoal-700">{inter.descricao}</p>
                                  <p className="text-[10px] text-charcoal-400 mt-1">
                                    {new Date(inter.data).toLocaleDateString('pt-BR')} às {new Date(inter.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {inter.usuario ? ` · ${inter.usuario}` : ''}
                                    <span className="ml-2 capitalize px-1.5 py-0.5 bg-cream-200 rounded text-[9px]">{inter.tipo}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            {/* ── Aba: Assinatura ── */}
            {assDetalheTab === 'assinatura' && (<>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Cliente', value: selected.clienteNome ?? '—' },
                { label: 'E-mail', value: selected.clienteEmail ?? '—' },
                { label: 'Telefone', value: selected.clienteTelefone ?? '—' },
                { label: 'Plano', value: selected.plano.nome },
                { label: 'Status', value: <Badge variant={statusVariant[selected.status]}>{selected.status}</Badge> },
                { label: 'Início', value: new Date(selected.dataInicio).toLocaleDateString('pt-BR') },
                { label: 'Total Mensal', value: `R$ ${selected.totalMensal.toFixed(2)}` },
                { label: 'Próx. Cobrança', value: new Date(selected.proximaCobranca).toLocaleDateString('pt-BR') },
                { label: 'Preferência', value: `${selected.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${selected.tipoMoagem ?? ''})`}` },
                { label: 'Forma de entrega', value: selected.formaEntrega === 'retirada' ? 'Retirada na loja' : 'Entrega' },
                {
                  label: 'ID Stripe',
                  value: selected.stripeSubscriptionId
                    ? <span className="font-mono text-xs text-charcoal-500 break-all">{selected.stripeSubscriptionId}</span>
                    : <span className="text-charcoal-400 text-xs">—</span>,
                },
              ].map(info => (
                <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                  <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                  <div className="text-sm font-medium text-charcoal-700">{info.value}</div>
                </div>
              ))}
            </div>

            {/* Ciclos / Edições e pedidos */}
            {selected.ciclos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Edições e pedidos</p>
                <div className="space-y-2">
                  {selected.ciclos.map(ciclo => {
                    const cicloStatusVariant: Record<string, string> = {
                      pendente: 'bg-amber-50 text-amber-700 border-amber-200',
                      enviado:  'bg-blue-50 text-blue-700 border-blue-200',
                      entregue: 'bg-forest-50 text-forest-700 border-forest-200',
                    };
                    const pedidoStatusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold'> = {
                      pago: 'pending', em_separacao: 'gold', enviado: 'gold',
                      entregue: 'active', disponivel_retirada: 'gold', retirado: 'active',
                      cancelado: 'cancelled', reembolsado: 'inactive',
                    };
                    return (
                      <div key={ciclo.id} className="flex flex-wrap items-start gap-3 py-2.5 border-b border-cream-100 last:border-0">
                        {/* Período */}
                        <div className="w-20 shrink-0">
                          <p className="text-sm font-medium text-charcoal-700">
                            {String(ciclo.mes).padStart(2, '0')}/{ciclo.ano}
                          </p>
                          <span className={`mt-0.5 inline-block px-1.5 py-0.5 text-xs rounded border ${cicloStatusVariant[ciclo.status] ?? ''}`}>
                            {ciclo.status}
                          </span>
                        </div>

                        {/* Edição */}
                        <div className="flex-1 min-w-0">
                          {ciclo.edicaoTitulo ? (
                            <p className="text-sm text-charcoal-600 truncate">{ciclo.edicaoTitulo}</p>
                          ) : (
                            <p className="text-xs text-charcoal-300 italic">Sem edição associada</p>
                          )}
                          {ciclo.codigoRastreio && (
                            <p className="text-xs text-charcoal-400 font-mono mt-0.5">{ciclo.codigoRastreio}</p>
                          )}
                        </div>

                        {/* Pedido */}
                        <div className="text-right shrink-0">
                          {ciclo.pedido ? (
                            <>
                              <p className="text-xs font-medium text-charcoal-600">{ciclo.pedido.numero}</p>
                              <Badge variant={pedidoStatusVariant[ciclo.pedido.status] ?? 'inactive'}>
                                {ciclo.pedido.status}
                              </Badge>
                            </>
                          ) : (
                            <span className="text-xs text-charcoal-300">Sem pedido</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Histórico de cobranças */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Histórico de cobranças</p>
              <div className="space-y-2">
                {selected.historicoCobrancas.map(cob => (
                  <div key={cob.id} className="flex items-center justify-between py-2 border-b border-cream-100">
                    <span className="text-sm text-charcoal-600">{new Date(cob.data).toLocaleDateString('pt-BR')}</span>
                    <span className="text-sm text-charcoal-700">R$ {cob.valor.toFixed(2)}</span>
                    <Badge variant={cob.status === 'pago' ? 'active' : cob.status === 'pendente' ? 'pending' : 'cancelled'}>
                      {cob.status}
                    </Badge>
                    <span className="text-xs text-charcoal-400">{cob.tentativas} tentativa(s)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancelamento agendado */}
            {selected.cancelamentoAgendado && selected.dataCancelamentoAgendado && (
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-sm text-sm">
                <span className="text-amber-700 flex items-center gap-2">
                  <Calendar size={14} />
                  Cancelamento agendado para {new Date(selected.dataCancelamentoAgendado).toLocaleDateString('pt-BR')}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={acaoEmAndamento === 'reactivate'}
                  onClick={() => handleAcao('reactivate', selected.id)}
                  icon={<RotateCcw size={13} />}
                >
                  Reverter
                </Button>
              </div>
            )}

            {/* Preferência e pedido manual */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFormPreferencia({
                    preferenciaCafe: selected.preferenciaCafe,
                    tipoMoagem: selected.tipoMoagem ?? '',
                  });
                  setEditandoPreferencia(true);
                }}
                icon={<Coffee size={13} />}
              >
                Alterar preferência
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={abrirEditarEntrega}
                icon={<Truck size={13} />}
              >
                Alterar forma de entrega
              </Button>
              {selected.status !== 'cancelada' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFormPedidoManual({
                      mes: String(new Date().getMonth() + 1),
                      ano: String(new Date().getFullYear()),
                      edicaoId: '',
                    });
                    setCriandoPedidoManual(true);
                  }}
                  icon={<Package size={13} />}
                >
                  Gerar pedido manual
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-cream-200">
              {/* Pausar / Retomar */}
              {selected.status === 'ativa' && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={acaoEmAndamento === 'pause'}
                  onClick={() => handleAcao('pause', selected.id)}
                  icon={<Pause size={13} />}
                >
                  Pausar cobrança
                </Button>
              )}
              {selected.status === 'pausada' && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={acaoEmAndamento === 'resume'}
                  onClick={() => handleAcao('resume', selected.id)}
                  icon={<Play size={13} />}
                >
                  Retomar
                </Button>
              )}

              {/* Gerar link de pagamento (pendente) */}
              {selected.status === 'pendente' && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={reprocessando === selected.id}
                  onClick={() => handleGerarLinkPagamento(selected)}
                  icon={<CreditCard size={13} />}
                >
                  Gerar link de pagamento
                </Button>
              )}

              {/* Tentar cobrar / Gerar link (inadimplente) */}
              {selected.status === 'inadimplente' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={acaoEmAndamento === 'retry_invoice'}
                    onClick={() => handleAcao('retry_invoice', selected.id)}
                    icon={<CreditCard size={13} />}
                  >
                    Tentar cobrar agora
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={reprocessando === selected.id}
                    onClick={() => handleReprocessar(selected.id)}
                    icon={<RefreshCw size={13} />}
                  >
                    Gerar link de pagamento
                  </Button>
                </>
              )}

              {/* Portal do cliente */}
              {selected.stripeSubscriptionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={acaoEmAndamento === 'billing_portal'}
                  onClick={() => handleAcao('billing_portal', selected.id)}
                  icon={<ExternalLink size={13} />}
                >
                  Portal Stripe
                </Button>
              )}

              {/* Cancelar */}
              {selected.status !== 'cancelada' && !selected.cancelamentoAgendado && (
                <>
                  {selected.status === 'ativa' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmCancelar({ tipo: 'agendado' })}
                      icon={<Calendar size={13} />}
                    >
                      Cancelar ao fim do período
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmCancelar({ tipo: 'imediato' })}
                    icon={<XCircle size={13} />}
                  >
                    Cancelar agora
                  </Button>
                </>
              )}
            </div>
            </>)}
          </div>
        )}
      </Modal>

      {/* ── Modal — Alterar Preferência ─────────────────────────────────────── */}
      <Modal
        open={editandoPreferencia && !!selected}
        onClose={() => setEditandoPreferencia(false)}
        title="Alterar Preferência de Café"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Tipo de café</label>
            <select
              value={formPreferencia.preferenciaCafe}
              onChange={e => setFormPreferencia(p => ({ ...p, preferenciaCafe: e.target.value as 'grao' | 'moido', tipoMoagem: '' }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            >
              <option value="grao">Grão inteiro</option>
              <option value="moido">Moído</option>
            </select>
          </div>

          {formPreferencia.preferenciaCafe === 'moido' && (
            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Tipo de moagem</label>
              <select
                value={formPreferencia.tipoMoagem}
                onChange={e => setFormPreferencia(p => ({ ...p, tipoMoagem: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              >
                <option value="">Selecione…</option>
                <option value="fino">Fino (espresso)</option>
                <option value="medio">Médio (coado/aeropress)</option>
                <option value="grosso">Grosso (prensa francesa)</option>
                <option value="extraGrosso">Extra grosso (cold brew)</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setEditandoPreferencia(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={salvandoPreferencia}
              icon={<Coffee size={14} />}
              onClick={handleSalvarPreferencia}
            >
              Salvar preferência
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal — Alterar Forma de Entrega ────────────────────────────────── */}
      <Modal
        open={editandoEntrega && !!selected}
        onClose={() => setEditandoEntrega(false)}
        title="Alterar Forma de Entrega"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Forma de entrega</label>
            <select
              value={formEntrega}
              onChange={e => {
                const val = e.target.value as 'entrega' | 'retirada';
                setFormEntrega(val);
                if (val === 'retirada') {
                  setFreteOpcoesEntrega([RETIRADA_OPCAO]);
                  setFreteSelecionadoId('retirada');
                } else {
                  setFreteOpcoesEntrega([]);
                  setFreteSelecionadoId('');
                }
              }}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            >
              <option value="retirada">Retirada na loja</option>
              <option value="entrega">Entrega no endereço</option>
            </select>
          </div>

          {formEntrega === 'retirada' ? (
            <p className="text-xs text-charcoal-400">O frete será removido (R$ 0,00) a partir da próxima cobrança.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-charcoal-400">
                  Endereço: {selected?.endereco.cidade}/{selected?.endereco.estado} — CEP {selected?.endereco.cep}
                </p>
                <Button variant="secondary" size="sm" loading={calculandoFrete} onClick={handleCalcularFreteEntrega}>
                  Calcular frete
                </Button>
              </div>
              {freteOpcoesEntrega.length > 0 && (
                <div className="space-y-1.5">
                  {freteOpcoesEntrega.map(op => (
                    <label
                      key={op.id}
                      className={`flex items-center justify-between px-3 py-2 border rounded-sm text-sm cursor-pointer transition-colors ${
                        freteSelecionadoId === op.id ? 'border-forest-400 bg-forest-50' : 'border-cream-200 hover:bg-cream-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio" name="freteOpcaoEntrega"
                          checked={freteSelecionadoId === op.id}
                          onChange={() => setFreteSelecionadoId(op.id)}
                          className="accent-forest-500"
                        />
                        {op.nome} <span className="text-charcoal-400">({op.empresa})</span>
                      </span>
                      <span className="font-medium text-charcoal-700">R$ {op.preco.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-charcoal-400 bg-cream-50 rounded-sm p-2.5">
            A mudança de valor vale a partir da próxima cobrança — não gera cobrança nem estorno no ciclo atual.
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setEditandoEntrega(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={salvandoEntrega}
              icon={<Truck size={14} />}
              onClick={handleSalvarFormaEntrega}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal — Gerar Pedido Manual ─────────────────────────────────────── */}
      <Modal
        open={criandoPedidoManual && !!selected}
        onClose={() => setCriandoPedidoManual(false)}
        title="Gerar Pedido Manual"
      >
        <div className="space-y-4">
          <p className="text-sm text-charcoal-500">
            Cria um pedido de assinatura para o período informado, caso o pedido automático não tenha sido gerado.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Mês *</label>
              <select
                value={formPedidoManual.mes}
                onChange={e => setFormPedidoManual(p => ({ ...p, mes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
              >
                {[
                  ['1','Janeiro'],['2','Fevereiro'],['3','Março'],['4','Abril'],
                  ['5','Maio'],['6','Junho'],['7','Julho'],['8','Agosto'],
                  ['9','Setembro'],['10','Outubro'],['11','Novembro'],['12','Dezembro'],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <Input
              label="Ano *"
              type="number"
              value={formPedidoManual.ano}
              onChange={e => setFormPedidoManual(p => ({ ...p, ano: e.target.value }))}
              placeholder="2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1.5">
              Edição do clube <span className="text-charcoal-400 font-normal">(opcional)</span>
            </label>
            <select
              value={formPedidoManual.edicaoId}
              onChange={e => setFormPedidoManual(p => ({ ...p, edicaoId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            >
              <option value="">Nenhuma edição associada</option>
              {edicoes.map(ed => (
                <option key={ed.id} value={ed.id}>
                  {ed.titulo} ({String(ed.mes).padStart(2,'0')}/{ed.ano})
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="p-3 bg-cream-50 rounded-sm text-sm text-charcoal-600 space-y-1">
              <p><span className="text-charcoal-400">Assinante:</span> {selected.clienteNome ?? '—'}</p>
              <p><span className="text-charcoal-400">Valor:</span> R$ {selected.totalMensal.toFixed(2)}</p>
              <p><span className="text-charcoal-400">Plano:</span> {selected.plano.nome}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setCriandoPedidoManual(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={salvandoPedidoManual}
              icon={<Package size={14} />}
              onClick={handleCriarPedidoManual}
            >
              Criar pedido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
