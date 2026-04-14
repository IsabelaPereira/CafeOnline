import React, { useEffect, useState } from 'react';
import { Calendar, Check, X, Clock, Users, Plus } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select, Textarea, SectionHeader, Tabs, StatCard
} from '../../components/ui';
import { getReservas, getMesas } from '../../services/reservas.service';
import type { Reserva, Mesa } from '../../types';

const statusColors: Record<string, string> = {
  solicitada: 'bg-gold-100 text-gold-700',
  confirmada: 'bg-forest-100 text-forest-700',
  recusada: 'bg-red-100 text-red-700',
  cancelada: 'bg-charcoal-100 text-charcoal-600',
  concluida: 'bg-blue-100 text-blue-700',
  no_show: 'bg-red-100 text-red-600',
};

export function AdminReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [tab, setTab] = useState('reservas');
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [novaReserva, setNovaReserva] = useState(false);

  useEffect(() => {
    getReservas().then(setReservas).catch(console.error);
    getMesas().then(setMesas).catch(console.error);
  }, []);

  const confirmadas = reservas.filter(r => r.status === 'confirmada').length;
  const pendentes = reservas.filter(r => r.status === 'solicitada').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Reservas"
        subtitle="Gestão da cafeteria e mesa"
        action={
          <Button variant="primary" size="sm" onClick={() => setNovaReserva(true)}>
            <Plus size={14} />
            Nova reserva
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Confirmadas" value={confirmadas} color="forest" icon={<Check size={18} />} />
        <StatCard title="Pendentes" value={pendentes} color="gold" icon={<Clock size={18} />} />
        <StatCard title="Mesas Ativas" value={mesas.filter(m => m.ativa).length} color="earth" icon={<Calendar size={18} />} />
        <StatCard title="Capacidade" value={mesas.reduce((s, m) => s + (m.ativa ? m.capacidade : 0), 0)} subtitle="lugares totais" color="forest" icon={<Users size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: 'reservas', label: 'Reservas', count: reservas.length },
          { id: 'mesas', label: 'Mesas', count: mesas.length },
          { id: 'configuracoes', label: 'Configurações' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'reservas' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Cliente</th>
                  <th className="table-th">Data / Horário</th>
                  <th className="table-th">Pessoas</th>
                  <th className="table-th">Mesa</th>
                  <th className="table-th">Observações</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map(r => (
                  <tr key={r.id} className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="table-td">
                      <p className="font-medium text-charcoal-700">{r.nome}</p>
                      <p className="text-xs text-charcoal-400">{r.telefone}</p>
                    </td>
                    <td className="table-td">
                      <p className="text-sm text-charcoal-700">
                        {new Date(r.data).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-charcoal-400">{r.horario}</p>
                    </td>
                    <td className="table-td text-charcoal-600">{r.pessoas}</td>
                    <td className="table-td text-charcoal-500">
                      {r.mesaId ? mesas.find(m => m.id === r.mesaId)?.numero ?? '—' : '—'}
                    </td>
                    <td className="table-td text-charcoal-500 max-w-xs truncate">
                      {r.observacoes || '—'}
                    </td>
                    <td className="table-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        {r.status === 'solicitada' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); }}
                              className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors"
                              title="Confirmar"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); }}
                              className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                              title="Recusar"
                            >
                              <X size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'mesas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mesas.map(mesa => (
            <Card key={mesa.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-xl text-charcoal-700">Mesa {mesa.numero}</h3>
                  {mesa.descricao && (
                    <p className="text-sm text-charcoal-400 mt-0.5">{mesa.descricao}</p>
                  )}
                </div>
                <Badge variant={mesa.ativa ? 'active' : 'inactive'}>
                  {mesa.ativa ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-charcoal-400" />
                <span className="text-sm text-charcoal-600">{mesa.capacidade} pessoas</span>
              </div>
              <Button variant="ghost" size="sm" className="w-full">Editar mesa</Button>
            </Card>
          ))}
          <Card className="flex items-center justify-center border-2 border-dashed border-cream-300 hover:border-forest-400 transition-colors cursor-pointer min-h-40">
            <div className="text-center">
              <Plus size={24} className="text-charcoal-300 mx-auto mb-2" />
              <p className="text-sm text-charcoal-400">Adicionar mesa</p>
            </div>
          </Card>
        </div>
      )}

      {tab === 'configuracoes' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-6">Configurações da cafeteria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              label="Aprovação de reservas"
              options={[
                { value: 'auto', label: 'Automática' },
                { value: 'manual', label: 'Manual' },
              ]}
            />
            <Input label="Tempo por reserva (minutos)" type="number" defaultValue="90" />
          </div>
          <div className="mt-6">
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-4">Horário de funcionamento</p>
            <div className="space-y-3">
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((dia, i) => (
                <div key={dia} className="flex items-center gap-4">
                  <span className="text-sm text-charcoal-600 w-20">{dia}</span>
                  <input type="checkbox" defaultChecked={i !== 0} className="accent-forest-500" />
                  <Input className="w-24" type="time" defaultValue={i === 5 || i === 6 ? "09:00" : "08:00"} />
                  <span className="text-charcoal-400 text-sm">às</span>
                  <Input className="w-24" type="time" defaultValue={i === 5 || i === 6 ? "17:00" : "18:00"} />
                </div>
              ))}
            </div>
          </div>
          <Button variant="primary" className="mt-6">Salvar configurações</Button>
        </Card>
      )}

      {/* Reservation Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalhes da Reserva"
        size="md"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nome', value: selected.nome },
                { label: 'E-mail', value: selected.email },
                { label: 'Telefone', value: selected.telefone },
                { label: 'Pessoas', value: String(selected.pessoas) },
                { label: 'Data', value: new Date(selected.data).toLocaleDateString('pt-BR') },
                { label: 'Horário', value: selected.horario },
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

            <div>
              <Select
                label="Atribuir mesa"
                value={selected.mesaId ?? ''}
                onChange={() => {}}
                placeholder="Selecionar mesa"
                options={mesas.filter(m => m.ativa).map(m => ({
                  value: m.id,
                  label: `Mesa ${m.numero} (${m.capacidade} lugares) ${m.descricao ? `— ${m.descricao}` : ''}`,
                }))}
              />
            </div>

            <Textarea label="Observações internas" placeholder="Notas internas sobre a reserva..." rows={2} />

            <div className="flex gap-3 pt-2 border-t border-cream-200">
              {selected.status === 'solicitada' && (
                <>
                  <Button variant="primary" size="sm">
                    <Check size={14} />
                    Confirmar
                  </Button>
                  <Button variant="danger" size="sm">
                    <X size={14} />
                    Recusar
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm">
                Enviar confirmação
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
