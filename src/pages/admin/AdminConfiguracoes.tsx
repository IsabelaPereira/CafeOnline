import React, { useState } from 'react';
import { Settings, Save, ExternalLink } from 'lucide-react';
import { Card, Button, Input, Textarea, Select, SectionHeader, Tabs } from '../../components/ui';

export function AdminConfiguracoes() {
  const [tab, setTab] = useState('empresa');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Configurações"
        subtitle="Configurações gerais do sistema"
      />

      <Tabs
        tabs={[
          { id: 'empresa', label: 'Empresa' },
          { id: 'integracoes', label: 'Integrações' },
          { id: 'cobranca', label: 'Cobrança' },
          { id: 'permissoes', label: 'Permissões' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'empresa' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-6">Dados da empresa</h3>
          <div className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nome da empresa" defaultValue="Das Matas Cafés Especiais" />
              <Input label="E-mail de contato" defaultValue="contato@dasmatas.com.br" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Telefone" defaultValue="(11) 99999-8888" />
              <Input label="WhatsApp" defaultValue="(11) 99999-8888" />
            </div>
            <Textarea label="Endereço completo" defaultValue="Rua dos Cafezais, 245 — Jardim Paulista, São Paulo, SP" rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Instagram" defaultValue="@dasmatas.cafe" />
              <Input label="Facebook" defaultValue="dasmatas.cafe" />
            </div>
            <div>
              <h4 className="font-medium text-charcoal-700 mb-3 text-sm">SEO Global</h4>
              <div className="space-y-3">
                <Input label="Meta Title padrão" defaultValue="Das Matas — Clube de Cafés Especiais" />
                <Textarea label="Meta Description padrão" defaultValue="Curadoria mensal de cafés especiais. Todo mês, dois cafés diferentes na sua casa." rows={2} />
              </div>
            </div>
            <Button variant="primary" onClick={handleSave} loading={saved} icon={<Save size={14} />}>
              {saved ? 'Salvo!' : 'Salvar configurações'}
            </Button>
          </div>
        </Card>
      )}

      {tab === 'integracoes' && (
        <div className="space-y-5">
          {[
            {
              nome: 'Pagar.me',
              descricao: 'Gateway de pagamento para assinaturas e pedidos.',
              status: 'placeholder',
              fields: [
                { label: 'API Key (Produção)', placeholder: 'pk_live_...' },
                { label: 'Secret Key', placeholder: 'sk_live_...' },
              ],
            },
            {
              nome: 'Stripe',
              descricao: 'Gateway de pagamento alternativo internacional.',
              status: 'placeholder',
              fields: [
                { label: 'Publishable Key', placeholder: 'pk_live_...' },
                { label: 'Secret Key', placeholder: 'sk_live_...' },
                { label: 'Webhook Secret', placeholder: 'whsec_...' },
              ],
            },
            {
              nome: 'Melhor Envio',
              descricao: 'Cálculo de frete e gestão logística.',
              status: 'placeholder',
              fields: [
                { label: 'Token de acesso', placeholder: 'Bearer token...' },
              ],
            },
            {
              nome: 'WhatsApp (Z-API)',
              descricao: 'Automações e comunicação via WhatsApp.',
              status: 'placeholder',
              fields: [
                { label: 'Instance ID', placeholder: 'INSTANCE_ID' },
                { label: 'Token', placeholder: 'TOKEN' },
              ],
            },
          ].map(integracao => (
            <Card key={integracao.nome}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-serif text-xl text-charcoal-700">{integracao.nome}</h3>
                  <p className="text-sm text-charcoal-400 mt-0.5">{integracao.descricao}</p>
                </div>
                <span className="px-2 py-0.5 bg-gold-100 text-gold-600 text-xs rounded-full border border-gold-200">
                  Aguardando configuração
                </span>
              </div>
              <div className="space-y-3 max-w-lg">
                {integracao.fields.map(field => (
                  <Input key={field.label} label={field.label} placeholder={field.placeholder} type="password" />
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="primary" size="sm">Salvar credenciais</Button>
                <Button variant="ghost" size="sm">
                  <ExternalLink size={14} />
                  Documentação
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'cobranca' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-6">Configurações de cobrança</h3>
          <div className="space-y-5 max-w-lg">
            <Select
              label="Dia de cobrança das assinaturas"
              options={Array.from({ length: 28 }, (_, i) => ({
                value: String(i + 1),
                label: `Dia ${i + 1}`,
              }))}
              defaultValue="5"
            />
            <Input
              label="Tentativas máximas de cobrança"
              type="number"
              defaultValue="3"
              hint="Número de tentativas antes de marcar como inadimplente"
            />
            <Input
              label="Intervalo entre tentativas (dias)"
              type="number"
              defaultValue="3"
            />
            <Select
              label="Ação após inadimplência"
              options={[
                { value: 'pausar', label: 'Pausar assinatura' },
                { value: 'cancelar', label: 'Cancelar assinatura' },
                { value: 'manter', label: 'Manter ativa e notificar' },
              ]}
              defaultValue="pausar"
            />
            <Button variant="primary" onClick={handleSave}>Salvar configurações</Button>
          </div>
        </Card>
      )}

      {tab === 'permissoes' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-6">Perfis de acesso</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Módulo</th>
                  {['Admin', 'Financeiro', 'Operações', 'Marketing', 'Conteúdo', 'Atendimento'].map(role => (
                    <th key={role} className="px-4 py-3 text-center text-xs font-medium text-charcoal-400 uppercase tracking-wider">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {[
                  'Dashboard', 'Pedidos', 'Assinaturas', 'CRM / Leads', 'Reservas',
                  'Produtos', 'Blog', 'Financeiro', 'Logística', 'Relatórios', 'Configurações',
                ].map(mod => (
                  <tr key={mod}>
                    <td className="px-4 py-3 text-sm text-charcoal-700">{mod}</td>
                    {[
                      [true, true, true, true, true, true],
                      [true, true, true, false, false, true],
                      [true, false, true, false, false, false],
                      [true, false, false, true, false, true],
                      [true, false, false, false, true, false],
                      [true, false, false, false, false, false],
                    ][['Dashboard', 'Pedidos', 'Assinaturas', 'CRM / Leads', 'Reservas', 'Produtos', 'Blog', 'Financeiro', 'Logística', 'Relatórios', 'Configurações'].indexOf(mod) % 6]?.map((has, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          defaultChecked={has}
                          className="accent-forest-500 w-4 h-4"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="primary" className="mt-5">Salvar permissões</Button>
        </Card>
      )}
    </div>
  );
}
