import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Filter } from 'lucide-react';
import {
  Card, Button, SectionHeader, Select
} from '../../components/ui';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getDashboardData } from '../../services/dashboard.service';
import type { DashboardData } from '../../services/dashboard.service';

const relatorios = [
  { id: 'vendas', label: 'Vendas' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'inadimplencia', label: 'Inadimplência' },
  { id: 'leads', label: 'Leads / CRM' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'avaliacoes', label: 'Avaliações' },
];

export function AdminRelatorios() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedRelatorio, setSelectedRelatorio] = useState('vendas');
  const [periodo, setPeriodo] = useState('abril_2026');

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Relatórios"
        subtitle="Central de relatórios do sistema"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card padding={false}>
            <div className="p-4 border-b border-cream-200">
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Relatórios</p>
            </div>
            <div className="py-2">
              {relatorios.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRelatorio(r.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    selectedRelatorio === r.id
                      ? 'bg-forest-50 text-forest-600 font-medium'
                      : 'text-charcoal-500 hover:bg-cream-50'
                  }`}
                >
                  <BarChart3 size={14} />
                  {r.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-5">
          {/* Filter bar */}
          <Card className="flex flex-wrap items-center gap-3">
            <Filter size={16} className="text-charcoal-400" />
            <Select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              options={[
                { value: 'abril_2026', label: 'Abril 2026' },
                { value: 'marco_2026', label: 'Março 2026' },
                { value: 'q1_2026', label: 'Q1 2026' },
                { value: 'anual_2026', label: 'Anual 2026' },
              ]}
              className="w-40"
            />
            <Button variant="secondary" size="sm">
              <Download size={14} />
              Exportar CSV
            </Button>
            <Button variant="ghost" size="sm">
              Exportar Excel
            </Button>
          </Card>

          {/* Charts */}
          {selectedRelatorio === 'vendas' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total de pedidos', value: '23' },
                  { label: 'Receita de vendas', value: 'R$ 2.847' },
                  { label: 'Ticket médio', value: 'R$ 123,78' },
                ].map(s => (
                  <Card key={s.label} className="text-center">
                    <p className="font-serif text-2xl text-charcoal-700">{s.value}</p>
                    <p className="text-xs text-charcoal-400 mt-1">{s.label}</p>
                  </Card>
                ))}
              </div>
              <Card padding={false}>
                <div className="px-6 py-4 border-b border-cream-200">
                  <h3 className="font-serif text-lg text-charcoal-700">Vendas por mês</h3>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboardData?.receitaPorMes ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: unknown) => [`R$ ${Number(v ?? 0).toLocaleString('pt-BR')}`, '']} />
                      <Bar dataKey="receita" name="Receita" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {selectedRelatorio === 'assinaturas' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Assinantes ativos', value: '127' },
                  { label: 'Churn rate', value: '2.3%' },
                  { label: 'MRR', value: 'R$ 16.891' },
                ].map(s => (
                  <Card key={s.label} className="text-center">
                    <p className="font-serif text-2xl text-charcoal-700">{s.value}</p>
                    <p className="text-xs text-charcoal-400 mt-1">{s.label}</p>
                  </Card>
                ))}
              </div>
              <Card padding={false}>
                <div className="px-6 py-4 border-b border-cream-200">
                  <h3 className="font-serif text-lg text-charcoal-700">Evolução das assinaturas</h3>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dashboardData?.evolucaoAssinaturas ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" name="Assinantes" stroke="#2D4A3E" strokeWidth={2} dot={{ fill: '#2D4A3E' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {selectedRelatorio !== 'vendas' && selectedRelatorio !== 'assinaturas' && (
            <Card className="text-center py-16">
              <BarChart3 size={48} className="text-charcoal-200 mx-auto mb-4" />
              <p className="font-serif text-xl text-charcoal-500 mb-2">
                Relatório: {relatorios.find(r => r.id === selectedRelatorio)?.label}
              </p>
              <p className="text-sm text-charcoal-400 mb-4">
                Selecione um período e clique em gerar relatório.
              </p>
              <Button variant="primary">Gerar relatório</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
