import React, { useEffect, useState } from 'react';
import { Plus, MessageCircle, Mail, Phone, Tag, Users, ArrowRight } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select, Textarea, SectionHeader,
  SearchBar, Tabs
} from '../../components/ui';
import { getLeads } from '../../services/leads.service';
import type { Lead, LeadEtapa } from '../../types';

const etapas: { id: LeadEtapa; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo Lead', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'interesse_assinatura', label: 'Interesse Assinatura', color: 'bg-gold-100 text-gold-700 border-gold-200' },
  { id: 'checkout_iniciado', label: 'Checkout Iniciado', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'assinatura_concluida', label: 'Assinatura Concluída', color: 'bg-forest-100 text-forest-700 border-forest-200' },
  { id: 'interesse_reserva', label: 'Interesse Reserva', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'cliente_ativo', label: 'Cliente Ativo', color: 'bg-forest-100 text-forest-700 border-forest-200' },
  { id: 'inadimplente', label: 'Inadimplente', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'recuperacao', label: 'Recuperação', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'perdido', label: 'Perdido', color: 'bg-charcoal-100 text-charcoal-600 border-charcoal-200' },
];

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const etapa = etapas.find(e => e.id === lead.etapa);
  const origemIcon = {
    checkout: '🛒', reserva: '📅', manual: '✍️', blog: '📝', social: '📱', indicacao: '👥', landing: '🎯'
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-sm border border-cream-200 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-charcoal-700 text-sm">{lead.nome}</p>
          <p className="text-xs text-charcoal-400">{lead.email}</p>
        </div>
        <span className="text-sm">{origemIcon[lead.origem] || '📋'}</span>
      </div>

      {lead.planoDesejado && (
        <p className="text-xs text-forest-600 mb-2">→ {lead.planoDesejado}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {lead.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded border border-cream-200">
            {tag}
          </span>
        ))}
      </div>

      {lead.proximoFollowUp && (
        <p className="text-xs text-charcoal-400">
          Follow-up: {new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  );
}

export function AdminCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState('funil');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [novoModal, setNovoModal] = useState(false);

  useEffect(() => {
    getLeads().then(setLeads).catch(console.error);
  }, []);

  const filteredLeads = leads.filter(l =>
    search === '' ||
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  );

  const leadsPorEtapa = (etapa: LeadEtapa) =>
    filteredLeads.filter(l => l.etapa === etapa);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="CRM / Leads"
        subtitle={`${leads.length} leads cadastrados`}
        action={
          <Button variant="primary" size="sm" onClick={() => setNovoModal(true)}>
            <Plus size={14} />
            Novo lead
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: 'funil', label: 'Funil Visual' },
          { id: 'lista', label: 'Lista de Leads', count: leads.length },
          { id: 'clientes', label: 'Clientes' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar leads..."
        className="max-w-md"
      />

      {/* FUNIL VIEW */}
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

      {/* LIST VIEW */}
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${etapa?.color}`}>
                          {etapa?.label}
                        </span>
                      </td>
                      <td className="table-td text-charcoal-500">{lead.planoDesejado || '—'}</td>
                      <td className="table-td text-charcoal-500">
                        {lead.proximoFollowUp
                          ? new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button className="p-1.5 text-charcoal-400 hover:text-green-500 hover:bg-green-50 rounded-sm transition-colors" title="WhatsApp">
                            <MessageCircle size={14} />
                          </button>
                          <button className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm transition-colors" title="E-mail">
                            <Mail size={14} />
                          </button>
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

      {/* CLIENTS VIEW */}
      {tab === 'clientes' && (
        <Card>
          <div className="text-center py-8">
            <Users size={48} className="text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-lg text-charcoal-500">Lista de clientes</p>
            <p className="text-sm text-charcoal-400 mt-1">Clientes com assinaturas ou pedidos ativos.</p>
          </div>
        </Card>
      )}

      {/* Lead Detail Modal */}
      <Modal
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.nome ?? ''}
        size="lg"
      >
        {selectedLead && (
          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'E-mail', value: selectedLead.email },
                { label: 'Telefone', value: selectedLead.telefone },
                { label: 'Origem', value: selectedLead.origem },
                { label: 'Plano desejado', value: selectedLead.planoDesejado || '—' },
              ].map(info => (
                <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                  <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                  <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                </div>
              ))}
            </div>

            {/* Etapa */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Etapa do funil</p>
              <Select
                value={selectedLead.etapa}
                onChange={() => {}}
                options={etapas.map(e => ({ value: e.id, label: e.label }))}
              />
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {selectedLead.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-cream-100 border border-cream-200 text-sm text-charcoal-600 rounded-full">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
                <button className="px-3 py-1 border-2 border-dashed border-cream-300 text-xs text-charcoal-400 rounded-full hover:border-forest-400 transition-colors">
                  + Tag
                </button>
              </div>
            </div>

            {/* Observações */}
            {selectedLead.observacoes && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Observações</p>
                <p className="text-sm text-charcoal-600 bg-cream-50 rounded-sm p-3">{selectedLead.observacoes}</p>
              </div>
            )}

            {/* Histórico */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                Histórico de interações ({selectedLead.interacoes.length})
              </p>
              {selectedLead.interacoes.length === 0 ? (
                <p className="text-sm text-charcoal-400">Nenhuma interação registrada.</p>
              ) : (
                <div className="space-y-3">
                  {selectedLead.interacoes.map(inter => (
                    <div key={inter.id} className="flex gap-3 p-3 bg-cream-50 rounded-sm">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        inter.tipo === 'email' ? 'bg-blue-100 text-blue-500' :
                        inter.tipo === 'whatsapp' ? 'bg-green-100 text-green-500' :
                        'bg-charcoal-100 text-charcoal-500'
                      }`}>
                        {inter.tipo === 'email' ? <Mail size={14} /> :
                         inter.tipo === 'whatsapp' ? <MessageCircle size={14} /> :
                         <Phone size={14} />}
                      </div>
                      <div>
                        <p className="text-sm text-charcoal-700">{inter.descricao}</p>
                        <p className="text-xs text-charcoal-400 mt-1">
                          {new Date(inter.data).toLocaleDateString('pt-BR')} · {inter.usuario}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Registrar interação */}
            <div>
              <Textarea
                label="Registrar interação"
                placeholder="Descreva o contato realizado..."
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" size="sm">
                  <MessageCircle size={14} />
                  WhatsApp
                </Button>
                <Button variant="ghost" size="sm">
                  <Mail size={14} />
                  E-mail
                </Button>
                <Button variant="secondary" size="sm">
                  Registrar
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-cream-200">
              <Button variant="primary" size="sm">
                <MessageCircle size={14} />
                Enviar WhatsApp
              </Button>
              <Button variant="secondary" size="sm">
                <Mail size={14} />
                Enviar e-mail
              </Button>
              {!selectedLead.clienteId && (
                <Button variant="ghost" size="sm">
                  <ArrowRight size={14} />
                  Converter em cliente
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Novo Lead Modal */}
      <Modal
        open={novoModal}
        onClose={() => setNovoModal(false)}
        title="Novo Lead"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" placeholder="Nome completo" />
            <Input label="E-mail" type="email" placeholder="email@exemplo.com" />
          </div>
          <Input label="Telefone" placeholder="(11) 99999-9999" />
          <Select
            label="Origem"
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'social', label: 'Redes Sociais' },
              { value: 'indicacao', label: 'Indicação' },
              { value: 'landing', label: 'Landing Page' },
            ]}
          />
          <Textarea label="Observações" placeholder="Observações sobre este lead..." rows={2} />
          <Button variant="primary" className="w-full">Salvar lead</Button>
        </div>
      </Modal>
    </div>
  );
}
