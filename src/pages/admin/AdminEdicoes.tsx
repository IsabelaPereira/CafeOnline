import React, { useEffect, useState } from 'react';
import {
  Plus, Globe, GlobeLock, ChevronDown, ChevronUp,
  Coffee, MapPin, Flame, Star, Trash2, Edit2, MessageSquare, Users,
} from 'lucide-react';
import { Card, Badge, Button, Modal, Alert, Input } from '../../components/ui';
import {
  getEdicoes, updateEdicao, createEdicao,
  addCafeEdicao, removeCafeEdicao,
} from '../../services/edicoes.service';
import { getAvaliacoesBox, getAvaliacoesCafe } from '../../services/avaliacoes.service';
import { getPlanos } from '../../services/assinaturas.service';
import { supabase } from '../../lib/supabase';
import type { EdicaoClube, CafeEdicao, PlanoAssinatura, AvaliacaoBox, AvaliacaoCafe } from '../../types';

const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesesCompletos = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchClienteNomes(clienteIds: string[]): Promise<Record<string, string>> {
  if (clienteIds.length === 0) return {};
  const { data: clientes } = await supabase.from('clientes').select('id, user_id').in('id', clienteIds);
  if (!clientes?.length) return {};
  const userIds = clientes.map((c: any) => c.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const result: Record<string, string> = {};
  clientes.forEach((c: any) => {
    const p = profileMap.get(c.user_id);
    result[c.id] = p?.name || p?.email || `${c.id.slice(0, 8)}…`;
  });
  return result;
}

function StarsDisplay({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} className={i <= value ? 'text-yellow-400 fill-yellow-400' : 'text-charcoal-200'} />
      ))}
      <span className="ml-1 text-xs text-charcoal-400">{value}/5</span>
    </span>
  );
}

// ── Form defaults ─────────────────────────────────────────────────────────────

interface FormEdicao {
  titulo: string; mes: number; ano: number;
  descricao: string; videoYoutube: string; textoExclusivo: string;
}
const defaultFormEdicao = (): FormEdicao => ({
  titulo: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear(),
  descricao: '', videoYoutube: '', textoExclusivo: '',
});

interface FormCafe {
  nome: string; descricao: string; produtor: string; regiao: string; estado: string;
  variedade: string; processo: string; altitude: string; torra: string;
  notasSensoriais: string; sugestoesPreparo: string; curiosidades: string;
}
const defaultFormCafe = (): FormCafe => ({
  nome: '', descricao: '', produtor: '', regiao: '', estado: '',
  variedade: '', processo: '', altitude: '', torra: '',
  notasSensoriais: '', sugestoesPreparo: '', curiosidades: '',
});

interface EditionRatings {
  box:   Array<AvaliacaoBox & { clienteNome: string }>;
  cafes: Array<AvaliacaoCafe & { clienteNome: string }>;
}

interface AssinanteEdicao {
  cicloId: string;
  assinaturaId: string;
  clienteId: string;
  clienteNome: string;
  clienteEmail: string;
  planoNome: string;
  status: 'pendente' | 'enviado' | 'entregue';
  dataEnvio?: string;
  dataEntrega?: string;
  codigoRastreio?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminEdicoes() {
  const [edicoes, setEdicoes]   = useState<EdicaoClube[]>([]);
  const [planos, setPlanos]     = useState<PlanoAssinatura[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [tabAtiva, setTabAtiva]   = useState<Record<string, 'cafes' | 'avaliacoes' | 'assinantes'>>({});

  // Modals
  type ModalType = 'new' | 'edit' | 'view' | 'cafe' | null;
  const [modal, setModal]           = useState<ModalType>(null);
  const [edicaoSel, setEdicaoSel]   = useState<EdicaoClube | null>(null);

  // Edition form
  const [formEdicao, setFormEdicao] = useState<FormEdicao>(defaultFormEdicao());
  const [savingEdicao, setSavingEdicao] = useState(false);
  const [erroEdicao, setErroEdicao]     = useState('');

  // Café form
  const [formCafe, setFormCafe]     = useState<FormCafe>(defaultFormCafe());
  const [savingCafe, setSavingCafe] = useState(false);
  const [erroCafe, setErroCafe]     = useState('');
  const [cafeEdicaoId, setCafeEdicaoId] = useState('');

  // Ratings
  const [ratings, setRatings]             = useState<Record<string, EditionRatings>>({});
  const [loadingRatings, setLoadingRatings] = useState<Record<string, boolean>>({});

  // Assinantes
  const [assinantes, setAssinantes]               = useState<Record<string, AssinanteEdicao[]>>({});
  const [loadingAssinantes, setLoadingAssinantes] = useState<Record<string, boolean>>({});

  // Feedback
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    getEdicoes().then(setEdicoes).catch(console.error);
    getPlanos().then(setPlanos).catch(console.error);
  }, []);

  // ── Expand / tabs ─────────────────────────────────────────────────────────

  function toggle(id: string) {
    setExpandido(prev => {
      if (prev === id) return null;
      setTabAtiva(t => ({ ...t, [id]: t[id] ?? 'cafes' }));
      return id;
    });
  }

  async function mudarTab(edicaoId: string, tab: 'cafes' | 'avaliacoes' | 'assinantes') {
    setTabAtiva(p => ({ ...p, [edicaoId]: tab }));
    if (tab === 'avaliacoes' && !ratings[edicaoId] && !loadingRatings[edicaoId]) {
      setLoadingRatings(p => ({ ...p, [edicaoId]: true }));
      try {
        const [boxList, cafeList] = await Promise.all([
          getAvaliacoesBox(undefined, edicaoId).catch(() => [] as AvaliacaoBox[]),
          getAvaliacoesCafe(undefined, edicaoId).catch(() => [] as AvaliacaoCafe[]),
        ]);
        const ids = [...new Set([...boxList.map(r => r.clienteId), ...cafeList.map(r => r.clienteId)])];
        const nomes = await fetchClienteNomes(ids);
        setRatings(p => ({
          ...p,
          [edicaoId]: {
            box:   boxList.map(r  => ({ ...r,  clienteNome: nomes[r.clienteId]  ?? r.clienteId.slice(0, 8) })),
            cafes: cafeList.map(r => ({ ...r,  clienteNome: nomes[r.clienteId]  ?? r.clienteId.slice(0, 8) })),
          },
        }));
      } finally {
        setLoadingRatings(p => ({ ...p, [edicaoId]: false }));
      }
    }
    if (tab === 'assinantes' && !assinantes[edicaoId] && !loadingAssinantes[edicaoId]) {
      fetchAssinantesEdicao(edicaoId);
    }
  }

  async function fetchAssinantesEdicao(edicaoId: string) {
    setLoadingAssinantes(p => ({ ...p, [edicaoId]: true }));
    try {
      const { data: ciclos } = await supabase
        .from('ciclos_assinatura')
        .select('id, status, data_envio, data_entrega, codigo_rastreio, assinatura:assinaturas(id, cliente_id, plano:planos(nome))')
        .eq('edicao_id', edicaoId)
        .order('created_at', { ascending: true });

      const rows = ciclos ?? [];
      const clienteIds = [...new Set(rows.map((c: any) => c.assinatura?.cliente_id).filter(Boolean))];

      const nomes = await fetchClienteNomes(clienteIds);

      // Fetch emails separately
      const { data: clientes } = await supabase.from('clientes').select('id, user_id').in('id', clienteIds);
      const userIds = (clientes ?? []).map((c: any) => c.user_id).filter(Boolean);
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', userIds);
      const profileByUserId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const userIdByClienteId = new Map((clientes ?? []).map((c: any) => [c.id, c.user_id]));

      const result: AssinanteEdicao[] = rows.map((c: any) => {
        const clienteId = c.assinatura?.cliente_id ?? '';
        const userId = userIdByClienteId.get(clienteId);
        const profile = profileByUserId.get(userId);
        return {
          cicloId:      c.id,
          assinaturaId: c.assinatura?.id ?? '',
          clienteId,
          clienteNome:  nomes[clienteId] ?? '—',
          clienteEmail: profile?.email ?? '—',
          planoNome:    c.assinatura?.plano?.nome ?? '—',
          status:       c.status as AssinanteEdicao['status'],
          dataEnvio:    c.data_envio ?? undefined,
          dataEntrega:  c.data_entrega ?? undefined,
          codigoRastreio: c.codigo_rastreio ?? undefined,
        };
      });

      setAssinantes(p => ({ ...p, [edicaoId]: result }));
    } finally {
      setLoadingAssinantes(p => ({ ...p, [edicaoId]: false }));
    }
  }

  // ── Edition CRUD ─────────────────────────────────────────────────────────

  function abrirNovaEdicao() {
    setFormEdicao(defaultFormEdicao());
    setErroEdicao('');
    setModal('new');
  }

  function abrirEditarEdicao(ed: EdicaoClube) {
    setEdicaoSel(ed);
    setFormEdicao({
      titulo: ed.titulo, mes: ed.mes, ano: ed.ano,
      descricao: ed.descricao, videoYoutube: ed.videoYoutube ?? '', textoExclusivo: ed.textoExclusivo ?? '',
    });
    setErroEdicao('');
    setModal('edit');
  }

  async function handleCriarEdicao() {
    if (!formEdicao.titulo.trim()) return;
    setSavingEdicao(true);
    setErroEdicao('');
    try {
      const nova = await createEdicao({
        titulo: formEdicao.titulo.trim(),
        mes: formEdicao.mes,
        ano: formEdicao.ano,
        descricao: formEdicao.descricao || undefined,
        videoYoutube: formEdicao.videoYoutube || undefined,
        textoExclusivo: formEdicao.textoExclusivo || undefined,
      });
      setEdicoes(prev => [nova, ...prev]);
      setModal(null);
      flash(`Edição "${nova.titulo}" criada como rascunho.`);
    } catch (err: any) {
      setErroEdicao(err?.message ?? 'Erro ao criar edição. Verifique as permissões.');
    } finally {
      setSavingEdicao(false);
    }
  }

  async function handleSalvarEdicao() {
    if (!edicaoSel || !formEdicao.titulo.trim()) return;
    setSavingEdicao(true);
    setErroEdicao('');
    try {
      await updateEdicao(edicaoSel.id, {
        titulo: formEdicao.titulo.trim(),
        mes: formEdicao.mes,
        ano: formEdicao.ano,
        descricao: formEdicao.descricao || undefined,
        videoYoutube: formEdicao.videoYoutube || undefined,
        textoExclusivo: formEdicao.textoExclusivo || undefined,
      });
      setEdicoes(prev => prev.map(e =>
        e.id === edicaoSel.id
          ? { ...e, titulo: formEdicao.titulo, mes: formEdicao.mes, ano: formEdicao.ano, descricao: formEdicao.descricao, videoYoutube: formEdicao.videoYoutube || undefined, textoExclusivo: formEdicao.textoExclusivo || undefined }
          : e,
      ));
      setModal(null);
      flash(`Edição atualizada.`);
    } catch (err: any) {
      setErroEdicao(err?.message ?? 'Erro ao salvar.');
    } finally {
      setSavingEdicao(false);
    }
  }

  async function togglePublicado(id: string) {
    const ed = edicoes.find(e => e.id === id);
    if (!ed) return;
    const novaPublicada = !ed.publicada;
    setEdicoes(prev => prev.map(e => e.id === id ? { ...e, publicada: novaPublicada } : e));
    flash(`Edição "${ed.titulo}" ${novaPublicada ? 'publicada' : 'despublicada'}.`);
    await updateEdicao(id, { publicada: novaPublicada }).catch(console.error);
  }

  // ── Café CRUD ─────────────────────────────────────────────────────────────

  function abrirAdicionarCafe(edicaoId: string) {
    setCafeEdicaoId(edicaoId);
    setFormCafe(defaultFormCafe());
    setErroCafe('');
    setModal('cafe');
  }

  async function handleAdicionarCafe() {
    if (!formCafe.nome.trim() || !cafeEdicaoId) return;
    setSavingCafe(true);
    setErroCafe('');
    try {
      const novo = await addCafeEdicao(cafeEdicaoId, {
        nome:             formCafe.nome.trim(),
        descricao:        formCafe.descricao,
        produtor:         formCafe.produtor,
        regiao:           formCafe.regiao,
        estado:           formCafe.estado,
        variedade:        formCafe.variedade,
        processo:         formCafe.processo,
        altitude:         formCafe.altitude,
        torra:            formCafe.torra,
        notasSensoriais:  formCafe.notasSensoriais.split(',').map(s => s.trim()).filter(Boolean),
        sugestoesPreparo: formCafe.sugestoesPreparo.split(',').map(s => s.trim()).filter(Boolean),
        curiosidades:     formCafe.curiosidades || undefined,
      });
      setEdicoes(prev => prev.map(e =>
        e.id === cafeEdicaoId ? { ...e, cafes: [...e.cafes, novo] } : e,
      ));
      setModal(null);
      flash('Café adicionado à edição.');
    } catch (err: any) {
      setErroCafe(err?.message ?? 'Erro ao adicionar café.');
    } finally {
      setSavingCafe(false);
    }
  }

  async function handleRemoverCafe(edicaoId: string, cafeId: string, cafeNome: string) {
    if (!window.confirm(`Remover "${cafeNome}" desta edição?`)) return;
    await removeCafeEdicao(cafeId).catch(console.error);
    setEdicoes(prev => prev.map(e =>
      e.id === edicaoId ? { ...e, cafes: e.cafes.filter(c => c.id !== cafeId) } : e,
    ));
  }

  function flash(msg: string) {
    setSucesso(msg);
    setTimeout(() => setSucesso(''), 4000);
  }

  const total     = edicoes.length;
  const publicadas = edicoes.filter(e => e.publicada).length;

  // ── Form field helpers ────────────────────────────────────────────────────

  const fieldEdicao = (label: string, key: keyof FormEdicao, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <Input label={label} value={String(formEdicao[key])} onChange={e => setFormEdicao(p => ({ ...p, [key]: props?.type === 'number' ? Number(e.target.value) : e.target.value }))} {...props} />
  );

  const textareaEdicao = (label: string, key: keyof FormEdicao, placeholder?: string, rows = 3) => (
    <div>
      <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">{label}</label>
      <textarea
        value={String(formEdicao[key])}
        onChange={e => setFormEdicao(p => ({ ...p, [key]: e.target.value }))}
        rows={rows}
        placeholder={placeholder}
        className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
      />
    </div>
  );

  const fieldCafe = (label: string, key: keyof FormCafe, placeholder?: string) => (
    <div>
      <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        value={formCafe[key]}
        onChange={e => setFormCafe(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
      />
    </div>
  );

  const edicaoFormFields = (
    <div className="space-y-4">
      {fieldEdicao('Título da edição *', 'titulo', { placeholder: 'Ex: Edição Verão — Frutados e Naturais' })}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Mês</label>
          <select
            value={formEdicao.mes}
            onChange={e => setFormEdicao(p => ({ ...p, mes: Number(e.target.value) }))}
            className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
          >
            {mesesCompletos.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        {fieldEdicao('Ano', 'ano', { type: 'number', min: 2020, max: 2099 })}
      </div>
      {textareaEdicao('Descrição', 'descricao', 'Breve descrição da curadoria desta edição...')}
      {fieldEdicao('Vídeo YouTube (URL)', 'videoYoutube', { placeholder: 'https://youtube.com/...' })}
      {textareaEdicao('Texto exclusivo para membros', 'textoExclusivo', 'Conteúdo especial visível apenas para assinantes...', 4)}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Edições do Clube</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie as edições mensais enviadas aos assinantes.</p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={abrirNovaEdicao}>
          Nova edição
        </Button>
      </div>

      {sucesso && <Alert type="success" message={sucesso} onClose={() => setSucesso('')} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de edições', value: total,            color: 'text-charcoal-700' },
          { label: 'Publicadas',        value: publicadas,       color: 'text-forest-600'   },
          { label: 'Rascunhos',         value: total - publicadas, color: 'text-yellow-600' },
          { label: 'Planos ativos',     value: planos.filter(p => p.ativo).length, color: 'text-earth-600' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <p className={`font-serif text-3xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-charcoal-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Edition list */}
      <div className="space-y-4">
        {edicoes.map(ed => {
          const aberto = expandido === ed.id;
          const tab    = tabAtiva[ed.id] ?? 'cafes';
          const rat    = ratings[ed.id];

          return (
            <Card key={ed.id} padding={false}>
              {/* Header row */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="shrink-0 w-12 h-12 bg-earth-100 rounded-sm flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-earth-600">{meses[ed.mes]}</span>
                      <span className="text-xs text-earth-500">{ed.ano}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg text-charcoal-700 truncate">{ed.titulo}</h3>
                        <Badge variant={ed.publicada ? 'active' : 'pending'}>
                          {ed.publicada ? 'Publicada' : 'Rascunho'}
                        </Badge>
                      </div>
                      <p className="text-sm text-charcoal-400 mt-0.5 line-clamp-1">{ed.descricao}</p>
                      <p className="text-xs text-charcoal-300 mt-1">
                        {ed.cafes.length} café{ed.cafes.length !== 1 ? 's' : ''} nesta edição
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => abrirEditarEdicao(ed)}
                      className="p-2 hover:bg-cream-100 rounded-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => togglePublicado(ed.id)}
                      className={`p-2 rounded-sm transition-colors ${ed.publicada ? 'hover:bg-red-50 text-forest-500 hover:text-red-500' : 'hover:bg-forest-50 text-charcoal-400 hover:text-forest-500'}`}
                      title={ed.publicada ? 'Despublicar' : 'Publicar'}
                    >
                      {ed.publicada ? <GlobeLock size={15} /> : <Globe size={15} />}
                    </button>
                    <button
                      onClick={() => toggle(ed.id)}
                      className="p-2 hover:bg-cream-100 rounded-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
                    >
                      {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {aberto && (
                <div className="border-t border-cream-100">
                  {/* Tabs */}
                  <div className="flex border-b border-cream-100">
                    {(['cafes', 'avaliacoes', 'assinantes'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => mudarTab(ed.id, t)}
                        className={`px-5 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                          tab === t
                            ? 'text-forest-600 border-b-2 border-forest-500'
                            : 'text-charcoal-400 hover:text-charcoal-600'
                        }`}
                      >
                        {t === 'cafes' ? `Cafés (${ed.cafes.length})` : t === 'avaliacoes' ? 'Avaliações' : 'Assinantes'}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Cafés */}
                  {tab === 'cafes' && (
                    <div className="px-5 pb-5">
                      {ed.cafes.length > 0 ? (
                        <>
                          <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mt-4 mb-3">Cafés desta edição</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {ed.cafes.map(cafe => (
                              <CafeCard
                                key={cafe.id}
                                cafe={cafe}
                                onRemove={() => handleRemoverCafe(ed.id, cafe.id, cafe.nome)}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="py-8 text-center">
                          <Coffee size={24} className="text-charcoal-200 mx-auto mb-2" />
                          <p className="text-sm text-charcoal-400">Nenhum café adicionado ainda.</p>
                        </div>
                      )}
                      <button
                        onClick={() => abrirAdicionarCafe(ed.id)}
                        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-forest-500 hover:text-forest-600 transition-colors"
                      >
                        <Plus size={13} />
                        Adicionar café
                      </button>
                    </div>
                  )}

                  {/* Tab: Assinantes */}
                  {tab === 'assinantes' && (
                    <div className="px-5 py-5">
                      {loadingAssinantes[ed.id] ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : !assinantes[ed.id] || assinantes[ed.id].length === 0 ? (
                        <div className="text-center py-8">
                          <Users size={24} className="text-charcoal-200 mx-auto mb-2" />
                          <p className="text-sm text-charcoal-400">Nenhum assinante recebeu esta edição ainda.</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">
                            {assinantes[ed.id].length} assinante{assinantes[ed.id].length !== 1 ? 's' : ''} nesta edição
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-cream-100">
                                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider pb-2 pr-4">Cliente</th>
                                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider pb-2 pr-4">Plano</th>
                                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider pb-2 pr-4">Status</th>
                                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider pb-2 pr-4">Envio</th>
                                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider pb-2">Rastreio</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-cream-50">
                                {assinantes[ed.id].map(a => (
                                  <tr key={a.cicloId} className="hover:bg-cream-50 transition-colors">
                                    <td className="py-2.5 pr-4">
                                      <p className="text-charcoal-700 font-medium">{a.clienteNome}</p>
                                      <p className="text-xs text-charcoal-400">{a.clienteEmail}</p>
                                    </td>
                                    <td className="py-2.5 pr-4 text-charcoal-600 text-xs">{a.planoNome}</td>
                                    <td className="py-2.5 pr-4">
                                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-sm ${
                                        a.status === 'entregue' ? 'bg-forest-50 text-forest-600' :
                                        a.status === 'enviado'  ? 'bg-blue-50 text-blue-600' :
                                        'bg-cream-100 text-charcoal-500'
                                      }`}>
                                        {a.status === 'entregue' ? 'Entregue' : a.status === 'enviado' ? 'Enviado' : 'Pendente'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 pr-4 text-xs text-charcoal-500">
                                      {a.dataEnvio ? new Date(a.dataEnvio).toLocaleDateString('pt-BR') : '—'}
                                    </td>
                                    <td className="py-2.5 text-xs text-charcoal-500 font-mono">
                                      {a.codigoRastreio ?? '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Avaliações */}
                  {tab === 'avaliacoes' && (
                    <div className="px-5 py-5">
                      {loadingRatings[ed.id] ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : !rat || (rat.box.length === 0 && rat.cafes.length === 0) ? (
                        <div className="text-center py-8">
                          <MessageSquare size={24} className="text-charcoal-200 mx-auto mb-2" />
                          <p className="text-sm text-charcoal-400">Nenhuma avaliação recebida ainda.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Box ratings */}
                          {rat.box.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">
                                Avaliações da Box ({rat.box.length})
                              </p>
                              <div className="space-y-3">
                                {rat.box.map(r => (
                                  <div key={r.id} className="bg-cream-50 rounded-sm p-3 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium text-charcoal-600">{r.clienteNome}</span>
                                      <StarsDisplay value={r.notaGeral} />
                                    </div>
                                    {r.comentario && (
                                      <p className="text-xs text-charcoal-500 italic">"{r.comentario}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Café ratings grouped by café */}
                          {rat.cafes.length > 0 && (() => {
                            const byCafe: Record<string, typeof rat.cafes> = {};
                            rat.cafes.forEach(r => {
                              if (!byCafe[r.cafeId]) byCafe[r.cafeId] = [];
                              byCafe[r.cafeId].push(r);
                            });
                            return (
                              <div>
                                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">
                                  Avaliações por Café
                                </p>
                                {Object.entries(byCafe).map(([cafeId, reviews]) => {
                                  const cafe = ed.cafes.find(c => c.id === cafeId);
                                  const avg  = reviews.reduce((s, r) => s + r.notaGeral, 0) / reviews.length;
                                  return (
                                    <div key={cafeId} className="mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <p className="text-sm font-medium text-charcoal-700">
                                          {cafe?.nome ?? 'Café'}
                                        </p>
                                        <StarsDisplay value={Math.round(avg)} />
                                        <span className="text-xs text-charcoal-400">({reviews.length})</span>
                                      </div>
                                      <div className="space-y-2">
                                        {reviews.map(r => (
                                          <div key={r.id} className="bg-cream-50 rounded-sm p-3 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-medium text-charcoal-600">{r.clienteNome}</span>
                                              <StarsDisplay value={r.notaGeral} />
                                            </div>
                                            {(r.aroma || r.docura || r.acidez || r.corpo || r.finalizacao) > 0 && (
                                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                {[
                                                  { l: 'Aroma', v: r.aroma },
                                                  { l: 'Doçura', v: r.docura },
                                                  { l: 'Acidez', v: r.acidez },
                                                  { l: 'Corpo', v: r.corpo },
                                                  { l: 'Final.', v: r.finalizacao },
                                                ].filter(x => x.v > 0).map(x => (
                                                  <span key={x.l} className="text-xs text-charcoal-400">
                                                    {x.l}: <span className="text-charcoal-600 font-medium">{x.v}/5</span>
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            {r.comentario && (
                                              <p className="text-xs text-charcoal-500 italic">"{r.comentario}"</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Modal: Nova edição ──────────────────────────────────────────────── */}
      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="Nova Edição do Clube" size="md">
        <div className="space-y-4">
          {edicaoFormFields}
          {erroEdicao && <Alert type="error" message={erroEdicao} />}
          <p className="text-xs text-charcoal-400">
            A edição será criada como rascunho. Adicione os cafés e publique quando estiver pronta.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              loading={savingEdicao}
              disabled={!formEdicao.titulo.trim()}
              onClick={handleCriarEdicao}
            >
              Criar edição
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Editar edição ────────────────────────────────────────────── */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title={`Editar: ${edicaoSel?.titulo ?? ''}`} size="md">
        <div className="space-y-4">
          {edicaoFormFields}
          {erroEdicao && <Alert type="error" message={erroEdicao} />}
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={savingEdicao}
              disabled={!formEdicao.titulo.trim()}
              onClick={handleSalvarEdicao}
            >
              Salvar alterações
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Adicionar café ───────────────────────────────────────────── */}
      <Modal open={modal === 'cafe'} onClose={() => setModal(null)} title="Adicionar Café à Edição" size="md">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {fieldCafe('Nome do café *', 'nome', 'Ex: Mogiana — Gesha Anaeróbico')}
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1">Descrição</label>
            <textarea
              value={formCafe.descricao}
              onChange={e => setFormCafe(p => ({ ...p, descricao: e.target.value }))}
              rows={2}
              placeholder="Descrição do café..."
              className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fieldCafe('Produtor', 'produtor', 'Nome do produtor')}
            {fieldCafe('Região', 'regiao', 'Ex: Mogiana')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fieldCafe('Estado', 'estado', 'Ex: SP')}
            {fieldCafe('Variedade', 'variedade', 'Ex: Gesha')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fieldCafe('Processo', 'processo', 'Ex: Natural, Lavado...')}
            {fieldCafe('Altitude', 'altitude', 'Ex: 1200 m')}
          </div>
          {fieldCafe('Torra', 'torra', 'Ex: Média-Clara')}
          {fieldCafe('Notas sensoriais', 'notasSensoriais', 'Manga, Maracujá, Hibisco (separadas por vírgula)')}
          {fieldCafe('Sugestões de preparo', 'sugestoesPreparo', 'Coado, Prensa Francesa (separadas por vírgula)')}
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1">Curiosidades</label>
            <textarea
              value={formCafe.curiosidades}
              onChange={e => setFormCafe(p => ({ ...p, curiosidades: e.target.value }))}
              rows={2}
              placeholder="Informações adicionais sobre o café..."
              className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
            />
          </div>
          {erroCafe && <Alert type="error" message={erroCafe} />}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-cream-100 mt-4">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          <Button
            variant="primary"
            icon={<Coffee size={14} />}
            loading={savingCafe}
            disabled={!formCafe.nome.trim()}
            onClick={handleAdicionarCafe}
          >
            Adicionar café
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Café card sub-component ───────────────────────────────────────────────────

function CafeCard({ cafe, onRemove }: { cafe: CafeEdicao; onRemove: () => void }) {
  return (
    <div className="bg-cream-50 rounded-sm p-4 relative group">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-charcoal-300 hover:text-red-500 transition-all rounded-sm hover:bg-red-50"
        title="Remover café"
      >
        <Trash2 size={12} />
      </button>
      <p className="font-serif text-sm text-charcoal-700 mb-1 pr-5">{cafe.nome}</p>
      <div className="flex items-center gap-3 text-xs text-charcoal-400 mb-2">
        <span className="flex items-center gap-1"><MapPin size={10} />{cafe.regiao}</span>
        <span className="flex items-center gap-1"><Flame size={10} />{cafe.torra}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {cafe.notasSensoriais.slice(0, 4).map(n => (
          <span key={n} className="bg-white border border-cream-200 text-charcoal-500 text-xs px-2 py-0.5 rounded-full">{n}</span>
        ))}
      </div>
    </div>
  );
}
