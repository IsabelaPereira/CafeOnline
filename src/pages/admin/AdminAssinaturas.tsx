import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  Card, Badge, SearchBar, FilterBar, Select, Pagination,
  Modal, Button, SectionHeader, StatCard, Tabs
} from '../../components/ui';
import { getAssinaturas, getPlanos } from '../../services/assinaturas.service';
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
  const perPage = 10;

  useEffect(() => {
    getAssinaturas().then(setAssinaturas).catch(console.error);
    getPlanos().then(setPlanos).catch(console.error);
  }, []);

  const filtered = assinaturas.filter(a =>
    (search === '' || a.plano.nome.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === '' || a.status === statusFilter)
  );

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
                    <td className="table-td font-medium text-charcoal-700">{assin.clienteId}</td>
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
                          <button className="p-1.5 text-charcoal-400 hover:text-orange-500 hover:bg-orange-50 rounded-sm transition-colors" title="Reprocessar pagamento">
                            <RefreshCw size={15} />
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
              <div className="flex items-center justify-between text-sm mb-4 p-3 bg-cream-50 rounded-sm">
                <span className="text-charcoal-500">Assinantes ativos</span>
                <span className="font-medium text-charcoal-700">
                  {assinaturas.filter(a => a.planoId === plano.id && a.status === 'ativa').length}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="w-full">Editar plano</Button>
            </Card>
          ))}
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
                { label: 'Plano', value: selected.plano.nome },
                { label: 'Status', value: <Badge variant={statusVariant[selected.status]}>{selected.status}</Badge> },
                { label: 'Início', value: new Date(selected.dataInicio).toLocaleDateString('pt-BR') },
                { label: 'Total Mensal', value: `R$ ${selected.totalMensal.toFixed(2)}` },
                { label: 'Próx. Cobrança', value: new Date(selected.proximaCobranca).toLocaleDateString('pt-BR') },
                { label: 'Preferência', value: `${selected.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${selected.tipoMoagem ?? ''})`}` },
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

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-cream-200">
              <Button variant="secondary" size="sm">Trocar plano</Button>
              <Button variant="secondary" size="sm">Alterar endereço</Button>
              {selected.status === 'inadimplente' && (
                <Button variant="primary" size="sm">
                  <RefreshCw size={14} />
                  Reprocessar pagamento
                </Button>
              )}
              <Button variant="danger" size="sm">Cancelar assinatura</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
