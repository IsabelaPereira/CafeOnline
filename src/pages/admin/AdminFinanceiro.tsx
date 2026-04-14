import React, { useEffect, useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Target, AlertTriangle,
  Upload, Plus, Download
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Card, Badge, Button, StatCard, Tabs, SectionHeader, SearchBar,
  FilterBar, Select, Modal, Input, Select as SelectUI, Textarea
} from '../../components/ui';
import {
  getContasReceber, getContasPagar, getCategorias, getDashboardFinanceiro
} from '../../services/financeiro.service';
import type { ContaReceber, ContaPagar, CategoriaFinanceira } from '../../types';

const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive'> = {
  recebido: 'active', pago: 'active', pendente: 'pending', vencido: 'cancelled', cancelado: 'inactive',
};

export function AdminFinanceiro() {
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<CategoriaFinanceira[]>([]);
  const [dashFinanceiro, setDashFinanceiro] = useState({ receitaTotal: 0, receitaRecebida: 0, despesaTotal: 0, despesaPaga: 0, lucroLiquido: 0, mrr: 0 });
  const [tab, setTab] = useState('visao');
  const [novaContaModal, setNovaContaModal] = useState(false);
  const [tipoConta, setTipoConta] = useState<'receber' | 'pagar'>('pagar');

  useEffect(() => {
    getContasReceber().then(setContasReceber).catch(console.error);
    getContasPagar().then(setContasPagar).catch(console.error);
    getCategorias().then(setCategoriasFinanceiras).catch(console.error);
    getDashboardFinanceiro().then(setDashFinanceiro).catch(console.error);
  }, []);

  const totalReceitas = contasReceber.reduce((s, c) => s + c.valor, 0);
  const totalRecebido = contasReceber.filter(c => c.status === 'recebido').reduce((s, c) => s + c.valor, 0);
  const totalPagar = contasPagar.reduce((s, c) => s + c.valor, 0);
  const totalPago = contasPagar.filter(c => c.status === 'pago').reduce((s, c) => s + c.valor, 0);
  const lucroLiquido = totalRecebido - totalPago;

  const mesesDRE = [
    { mes: 'Jan', receita: 14200, custos: 5500, despesas: 6400 },
    { mes: 'Fev', receita: 15100, custos: 5800, despesas: 6500 },
    { mes: 'Mar', receita: 16200, custos: 6000, despesas: 7100 },
    { mes: 'Abr', receita: 18450, custos: 6500, despesas: 7820 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Financeiro"
        subtitle="Gestão financeira completa"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setTipoConta('receber'); setNovaContaModal(true); }}
            >
              <Plus size={14} />
              A Receber
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setTipoConta('pagar'); setNovaContaModal(true); }}
            >
              <Plus size={14} />
              A Pagar
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'visao', label: 'Visão Geral' },
          { id: 'receber', label: 'A Receber', count: contasReceber.filter(c => c.status === 'pendente').length },
          { id: 'pagar', label: 'A Pagar', count: contasPagar.filter(c => c.status === 'pendente').length },
          { id: 'dre', label: 'DRE' },
          { id: 'fluxo', label: 'Fluxo de Caixa' },
          { id: 'planejador', label: 'Planejador' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* VISÃO GERAL */}
      {tab === 'visao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Receita Bruta (Abr)"
              value={`R$ ${(dashFinanceiro.receitaTotal / 1000).toFixed(1)}k`}
              color="forest"
              icon={<TrendingUp size={18} />}
              trend={{ value: 14, label: 'vs mar' }}
            />
            <StatCard
              title="Despesas (Abr)"
              value={`R$ ${(dashFinanceiro.despesaTotal / 1000).toFixed(1)}k`}
              color="earth"
              icon={<TrendingDown size={18} />}
              trend={{ value: 9.3, label: 'vs mar' }}
            />
            <StatCard
              title="Resultado Operac."
              value={`R$ ${((dashFinanceiro.receitaTotal - dashFinanceiro.despesaTotal) / 1000).toFixed(1)}k`}
              color="gold"
              icon={<Target size={18} />}
            />
            <StatCard
              title="Margem Líquida"
              value={`${(((dashFinanceiro.receitaTotal - dashFinanceiro.despesaTotal) / dashFinanceiro.receitaTotal) * 100).toFixed(1)}%`}
              color="forest"
              icon={<DollarSign size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding={false}>
              <div className="px-6 py-4 border-b border-cream-200">
                <h3 className="font-serif text-lg text-charcoal-700">Receita × Despesas</h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={[]}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D4A3E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2D4A3E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C4956A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C4956A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="receita" name="Receita" stroke="#2D4A3E" fill="url(#grad1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#C4956A" fill="url(#grad2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="space-y-4">
              {/* A receber pendente */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif text-lg text-charcoal-700">A Receber</h4>
                  <Badge variant="pending">{contasReceber.filter(c => c.status === 'pendente').length} pendentes</Badge>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-serif text-2xl text-charcoal-700">R$ {totalReceitas.toFixed(2)}</span>
                  <span className="text-xs text-charcoal-400">total</span>
                </div>
                <p className="text-sm text-forest-600">R$ {totalRecebido.toFixed(2)} já recebido</p>
              </Card>

              {/* A pagar pendente */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif text-lg text-charcoal-700">A Pagar</h4>
                  <Badge variant="pending">{contasPagar.filter(c => c.status === 'pendente').length} pendentes</Badge>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-serif text-2xl text-charcoal-700">R$ {totalPagar.toFixed(2)}</span>
                  <span className="text-xs text-charcoal-400">total</span>
                </div>
                <p className="text-sm text-charcoal-500">R$ {totalPago.toFixed(2)} já pago</p>
              </Card>

              <Card className="bg-forest-500">
                <p className="text-xs text-forest-200 uppercase tracking-wider mb-2">Resultado do Mês</p>
                <p className="font-serif text-3xl text-cream-100">R$ {lucroLiquido.toFixed(2)}</p>
                <p className="text-forest-200 text-sm mt-1">Receitas menos despesas pagas</p>
              </Card>
            </div>
          </div>

          {/* Alertas */}
          <Card>
            <h3 className="font-serif text-lg text-charcoal-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-gold-500" />
              Alertas Financeiros
            </h3>
            <div className="space-y-3">
              {[
                { type: 'warning', msg: '3 contas a pagar vencem nos próximos 7 dias — R$ 1.569,00' },
                { type: 'info', msg: '2 recebíveis em atraso — R$ 303,40' },
                { type: 'success', msg: 'Receita 14% acima do mês anterior' },
              ].map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-sm ${
                  alert.type === 'warning' ? 'bg-gold-50 border border-gold-200' :
                  alert.type === 'info' ? 'bg-blue-50 border border-blue-200' :
                  'bg-forest-50 border border-forest-200'
                }`}>
                  <AlertTriangle size={14} className={
                    alert.type === 'warning' ? 'text-gold-500' :
                    alert.type === 'info' ? 'text-blue-500' :
                    'text-forest-500'
                  } />
                  <p className="text-sm text-charcoal-700">{alert.msg}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* CONTAS A RECEBER */}
      {tab === 'receber' && (
        <Card padding={false}>
          <FilterBar onExport={() => {}}>
            <Select
              value=""
              onChange={() => {}}
              options={[{ value: '', label: 'Todos os status' }, { value: 'pendente', label: 'Pendente' }, { value: 'recebido', label: 'Recebido' }]}
              className="w-36"
            />
          </FilterBar>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Descrição</th>
                  <th className="table-th">Cliente</th>
                  <th className="table-th">Valor</th>
                  <th className="table-th">Vencimento</th>
                  <th className="table-th">Categoria</th>
                  <th className="table-th">Competência</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {contasReceber.map(c => (
                  <tr key={c.id} className="border-t border-cream-100 hover:bg-cream-50">
                    <td className="table-td text-charcoal-700">{c.descricao}</td>
                    <td className="table-td text-charcoal-500">{c.cliente || '—'}</td>
                    <td className="table-td font-medium text-charcoal-700">R$ {c.valor.toFixed(2)}</td>
                    <td className="table-td text-charcoal-500">
                      {new Date(c.dataVencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="table-td text-charcoal-500">{c.categoria}</td>
                    <td className="table-td text-charcoal-500">{c.competencia}</td>
                    <td className="table-td">
                      <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-cream-50 border-t border-cream-200 flex justify-between">
            <span className="text-sm text-charcoal-500">Total</span>
            <span className="font-serif text-lg text-charcoal-700">R$ {totalReceitas.toFixed(2)}</span>
          </div>
        </Card>
      )}

      {/* CONTAS A PAGAR */}
      {tab === 'pagar' && (
        <Card padding={false}>
          <FilterBar onExport={() => {}}>
            <Select
              value=""
              onChange={() => {}}
              options={[{ value: '', label: 'Todos os status' }, { value: 'pendente', label: 'Pendente' }, { value: 'pago', label: 'Pago' }]}
              className="w-36"
            />
          </FilterBar>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Descrição</th>
                  <th className="table-th">Fornecedor</th>
                  <th className="table-th">Valor</th>
                  <th className="table-th">Vencimento</th>
                  <th className="table-th">Categoria</th>
                  <th className="table-th">Centro de Custo</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasPagar.map(c => (
                  <tr key={c.id} className="border-t border-cream-100 hover:bg-cream-50">
                    <td className="table-td text-charcoal-700">{c.descricao}</td>
                    <td className="table-td text-charcoal-500">{c.fornecedor || '—'}</td>
                    <td className="table-td font-medium text-charcoal-700">R$ {c.valor.toFixed(2)}</td>
                    <td className="table-td">
                      <span className={new Date(c.dataVencimento) < new Date() && c.status === 'pendente' ? 'text-red-500 font-medium' : 'text-charcoal-500'}>
                        {new Date(c.dataVencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="table-td text-charcoal-500">{c.categoria}</td>
                    <td className="table-td text-charcoal-500">{c.centroCusto || '—'}</td>
                    <td className="table-td">
                      <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="table-td">
                      {c.status === 'pendente' && (
                        <Button variant="ghost" size="sm">Baixar</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-cream-50 border-t border-cream-200 flex justify-between">
            <span className="text-sm text-charcoal-500">Total</span>
            <span className="font-serif text-lg text-charcoal-700">R$ {totalPagar.toFixed(2)}</span>
          </div>
        </Card>
      )}

      {/* DRE */}
      {tab === 'dre' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-xl text-charcoal-700 mb-6">DRE — Demonstrativo de Resultado</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Linha</th>
                    {mesesDRE.map(m => (
                      <th key={m.mes} className="px-4 py-3 text-right text-xs font-medium text-charcoal-400 uppercase tracking-wider">{m.mes}/2026</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {[
                    { label: 'Receita Bruta', calc: (m: typeof mesesDRE[0]) => m.receita, bold: false },
                    { label: 'Deduções (aprox. 8%)', calc: (m: typeof mesesDRE[0]) => -(m.receita * 0.08), bold: false },
                    { label: 'Receita Líquida', calc: (m: typeof mesesDRE[0]) => m.receita * 0.92, bold: true },
                    { label: 'Custo dos Produtos', calc: (m: typeof mesesDRE[0]) => -m.custos, bold: false },
                    { label: 'Margem Bruta', calc: (m: typeof mesesDRE[0]) => m.receita * 0.92 - m.custos, bold: true },
                    { label: 'Despesas Operacionais', calc: (m: typeof mesesDRE[0]) => -m.despesas, bold: false },
                    { label: 'Resultado Operacional', calc: (m: typeof mesesDRE[0]) => m.receita * 0.92 - m.custos - m.despesas, bold: true },
                  ].map(row => (
                    <tr key={row.label} className={row.bold ? 'bg-cream-50 font-medium' : ''}>
                      <td className="px-4 py-3 text-sm text-charcoal-700">{row.label}</td>
                      {mesesDRE.map(m => {
                        const val = row.calc(m);
                        return (
                          <td key={m.mes} className={`px-4 py-3 text-right text-sm ${val < 0 ? 'text-red-600' : 'text-charcoal-700'}`}>
                            R$ {Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-lg text-charcoal-700">DRE Visual</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mesesDRE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="custos" name="Custos" fill="#C4956A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#8B5E3C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* FLUXO DE CAIXA */}
      {tab === 'fluxo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Entradas Previstas" value="R$ 18.450" color="forest" icon={<TrendingUp size={18} />} />
            <StatCard title="Saídas Previstas" value="R$ 14.320" color="earth" icon={<TrendingDown size={18} />} />
            <StatCard title="Saldo Projetado" value="R$ 4.130" color="gold" icon={<Target size={18} />} />
          </div>

          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-lg text-charcoal-700">Fluxo de Caixa — Abril/2026</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#C4956A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* PLANEJADOR */}
      {tab === 'planejador' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-2 border-forest-200 bg-forest-50">
              <p className="text-xs text-forest-500 uppercase tracking-wider mb-2">Meta de Receita — Maio</p>
              <p className="font-serif text-3xl text-forest-700">R$ 20.000</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-charcoal-500 mb-1">
                  <span>Progresso atual</span>
                  <span>92%</span>
                </div>
                <div className="w-full bg-forest-100 rounded-full h-2">
                  <div className="h-2 bg-forest-500 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </Card>
            <Card>
              <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">Projeção Anual</p>
              <p className="font-serif text-3xl text-charcoal-700">R$ 198k</p>
              <p className="text-sm text-charcoal-400 mt-2">Baseada na média dos últimos 3 meses</p>
            </Card>
            <Card>
              <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">Ticket Médio</p>
              <p className="font-serif text-3xl text-charcoal-700">R$ 145</p>
              <p className="text-sm text-forest-500 mt-2">↑ 8% vs mês anterior</p>
            </Card>
          </div>

          <Card>
            <h3 className="font-serif text-xl text-charcoal-700 mb-5">Insights & Recomendações</h3>
            <div className="space-y-3">
              {[
                { tipo: 'success', titulo: 'Crescimento sólido de assinaturas', desc: 'Com 127 assinantes ativos (+5.8% vs mês anterior), o MRR está em expansão consistente. Meta de 150 assinantes para agosto é factível no ritmo atual.' },
                { tipo: 'warning', titulo: 'Inadimplência acima do ideal', desc: '6.3% da base (8 clientes) está inadimplente. Recomenda-se acionar o fluxo de recuperação via WhatsApp para os inadimplentes há menos de 30 dias.' },
                { tipo: 'info', titulo: 'Margem operacional saudável', desc: `Margem operacional de ${(((dashFinanceiro.receitaTotal - dashFinanceiro.despesaTotal) / dashFinanceiro.receitaTotal) * 100).toFixed(1)}% este mês. Monitorar custo logístico que subiu 9% em relação a março.` },
              ].map((insight, i) => (
                <div key={i} className={`p-4 rounded-sm border ${
                  insight.tipo === 'success' ? 'bg-forest-50 border-forest-200' :
                  insight.tipo === 'warning' ? 'bg-gold-50 border-gold-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <p className="font-medium text-sm text-charcoal-700 mb-1">{insight.titulo}</p>
                  <p className="text-sm text-charcoal-500">{insight.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Modal Nova Conta */}
      <Modal
        open={novaContaModal}
        onClose={() => setNovaContaModal(false)}
        title={tipoConta === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
        size="md"
      >
        <div className="space-y-4">
          <Input label="Descrição" required placeholder="Descrição da conta" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor" type="number" placeholder="0.00" />
            <Input label="Vencimento" type="date" />
          </div>
          <Select
            label="Categoria"
            options={categoriasFinanceiras
              .filter(c => c.tipo === (tipoConta === 'pagar' ? 'despesa' : 'receita'))
              .map(c => ({ value: c.id, label: c.nome }))}
            placeholder="Selecione a categoria"
          />
          <Input label={tipoConta === 'pagar' ? 'Fornecedor' : 'Cliente'} placeholder="Nome" />
          <Input label="Centro de custo" placeholder="Ex: Clube, Loja, Cafeteria" />
          <Input label="Competência (AAAA-MM)" placeholder="2026-04" />
          <Textarea label="Observações" rows={2} />
          {tipoConta === 'pagar' && (
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Comprovante / NF</p>
              <div className="flex items-center justify-center border-2 border-dashed border-cream-300 rounded-sm p-6 hover:border-forest-400 cursor-pointer transition-colors">
                <div className="text-center">
                  <Upload size={24} className="text-charcoal-300 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-400">Clique ou arraste o arquivo</p>
                </div>
              </div>
            </div>
          )}
          <Button variant="primary" className="w-full">Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
