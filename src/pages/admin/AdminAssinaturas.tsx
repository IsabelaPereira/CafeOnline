import { useEffect, useState } from 'react';
import { Eye, RefreshCw, AlertTriangle, Copy, ExternalLink, Plus, Pause, Play, XCircle, RotateCcw, CreditCard, Calendar } from 'lucide-react';
import {
  Card, Badge, SearchBar, FilterBar, Select, Pagination,
  Modal, Button, SectionHeader, StatCard, Tabs, Input
} from '../../components/ui';
import { getAssinaturas, getPlanos, updatePlano, createPlano, manageAssinatura } from '../../services/assinaturas.service';
import { supabase } from '../../lib/supabase';
import type { Assinatura, PlanoAssinatura } from '../../types';

const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive'> = {
  ativa: 'active', pendente: 'pending', inadimplente: 'cancelled', cancelada: 'inactive', pausada: 'inactive',
};

export function AdminAssinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [planos, setPlanos] = useState<PlanoAssinatura[]>([]);
  const [tab, setTab] = useState('assinantes');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
  const perPage = 10;

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

  useEffect(() => {
    getAssinaturas().then(setAssinaturas).catch(console.error);
    getPlanos().then(setPlanos).catch(console.error);
  }, []);

  const filtered = assinaturas.filter(a => {
    const termo = search.toLowerCase();
    const matchSearch = search === ''
      || (a.clienteNome ?? '').toLowerCase().includes(termo)
      || (a.clienteEmail ?? '').toLowerCase().includes(termo)
      || a.plano.nome.toLowerCase().includes(termo);
    return matchSearch && (statusFilter === '' || a.status === statusFilter);
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
          <FilterBar onExport={() => alert('Exportando...')}>
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar assinante..." className="w-64" />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'ativa', label: 'Ativa' },
                { value: 'pendente', label: 'Pendente' },
                { value: 'inadimplente', label: 'Inadimplente' },
                { value: 'cancelada', label: 'Cancelada' },
              ]}
              className="w-40"
            />
          </FilterBar>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Cliente</th>
                  <th className="table-th">Plano</th>
                  <th className="table-th">Total Mensal</th>
                  <th className="table-th">Próx. Cobrança</th>
                  <th className="table-th">Próx. Envio</th>
                  <th className="table-th">Preferência</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * perPage, page * perPage).map(assin => (
                  <tr key={assin.id} className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer" onClick={() => setSelected(assin)}>
                    <td className="table-td">
                      <p className="font-medium text-charcoal-700">{assin.clienteNome ?? '—'}</p>
                      {assin.clienteEmail && <p className="text-xs text-charcoal-400">{assin.clienteEmail}</p>}
                    </td>
                    <td className="table-td text-charcoal-600">{assin.plano.nome}</td>
                    <td className="table-td font-medium text-charcoal-700">R$ {assin.totalMensal.toFixed(2)}</td>
                    <td className="table-td text-charcoal-500">
                      {new Date(assin.proximaCobranca).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="table-td text-charcoal-500">
                      {new Date(assin.proximoEnvio).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="table-td text-charcoal-500 capitalize">
                      {assin.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${assin.tipoMoagem ?? ''})`}
                    </td>
                    <td className="table-td">
                      <Badge variant={statusVariant[assin.status]}>{assin.status}</Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(assin); }}
                          className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        {assin.status === 'inadimplente' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleReprocessar(assin.id); }}
                            disabled={reprocessando === assin.id}
                            className="p-1.5 text-charcoal-400 hover:text-orange-500 hover:bg-orange-50 rounded-sm transition-colors disabled:opacity-50"
                            title="Reprocessar pagamento"
                          >
                            <RefreshCw size={15} className={reprocessando === assin.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
          </div>
        )}
      </Modal>
    </div>
  );
}
