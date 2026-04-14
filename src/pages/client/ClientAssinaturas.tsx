import React, { useState } from 'react';
import { Package, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { Card, Badge, Button, Modal, Select, Alert } from '../../components/ui';
import { useClienteAssinaturas } from '../../hooks/useCliente';
import { usePlanos } from '../../hooks/useAssinaturas';

export function ClientAssinaturas() {
  const { assinaturas } = useClienteAssinaturas();
  const { data: planos } = usePlanos();
  const assinatura = assinaturas[0];
  const [modalCancelar, setModalCancelar] = useState(false);
  const [modalTrocarPlano, setModalTrocarPlano] = useState(false);
  const [novoPlano, setNovoPlano] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);

  const statusBadge = {
    ativa: <Badge variant="active">Ativa</Badge>,
    pendente: <Badge variant="pending">Pendente</Badge>,
    inadimplente: <Badge variant="cancelled">Inadimplente</Badge>,
    cancelada: <Badge variant="inactive">Cancelada</Badge>,
    pausada: <Badge variant="inactive">Pausada</Badge>,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Minhas Assinaturas</h1>
        <p className="text-charcoal-400 text-sm mt-1">Gerencie seus planos e histórico de cobrança.</p>
      </div>

      {/* Assinatura principal */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-serif text-2xl text-charcoal-700">{assinatura.plano.nome}</h2>
              {statusBadge[assinatura.status]}
            </div>
            <p className="text-charcoal-400 text-sm">Desde {new Date(assinatura.dataInicio).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-3xl text-charcoal-700">R$ {assinatura.totalMensal.toFixed(2)}</p>
            <p className="text-xs text-charcoal-400">por mês (plano + frete)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Plano', value: `R$ ${assinatura.plano.preco.toFixed(2)}` },
            { label: 'Frete', value: `R$ ${assinatura.frete.toFixed(2)}` },
            { label: 'Próx. cobrança', value: new Date(assinatura.proximaCobranca).toLocaleDateString('pt-BR') },
            { label: 'Próx. envio', value: new Date(assinatura.proximoEnvio).toLocaleDateString('pt-BR') },
          ].map(info => (
            <div key={info.label} className="bg-cream-50 rounded-sm p-3">
              <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
              <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-cream-200 pt-5">
          <Button variant="secondary" size="sm" onClick={() => setModalTrocarPlano(true)}>
            Trocar plano
          </Button>
          <Button variant="ghost" size="sm">
            Alterar endereço
          </Button>
          <Button variant="ghost" size="sm">
            Alterar preferência
          </Button>
          <button
            onClick={() => setModalCancelar(true)}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            Cancelar assinatura
          </button>
        </div>
      </Card>

      {/* Histórico de cobranças */}
      <Card padding={false}>
        <button
          onClick={() => setShowHistorico(!showHistorico)}
          className="w-full flex items-center justify-between px-6 py-4"
        >
          <h3 className="font-serif text-lg text-charcoal-700">Histórico de cobranças</h3>
          <ChevronDown
            size={18}
            className={`text-charcoal-400 transition-transform ${showHistorico ? 'rotate-180' : ''}`}
          />
        </button>
        {showHistorico && (
          <div className="border-t border-cream-200 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Tentativas</th>
                </tr>
              </thead>
              <tbody>
                {assinatura.historicoCobrancas.map(cob => (
                  <tr key={cob.id} className="border-t border-cream-100">
                    <td className="px-6 py-3 text-sm text-charcoal-600">
                      {new Date(cob.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-charcoal-700">
                      R$ {cob.valor.toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={
                        cob.status === 'pago' ? 'active' :
                        cob.status === 'pendente' ? 'pending' :
                        'cancelled'
                      }>
                        {cob.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-charcoal-500">{cob.tentativas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ciclos / Edições */}
      <Card>
        <h3 className="font-serif text-lg text-charcoal-700 mb-5">Edições do Clube</h3>
        <div className="space-y-3">
          {assinatura.ciclos.map(ciclo => (
            <div key={ciclo.id} className="flex items-center gap-4 p-4 bg-cream-50 rounded-sm">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                ciclo.status === 'entregue' ? 'bg-forest-100 text-forest-500' :
                ciclo.status === 'enviado' ? 'bg-gold-100 text-gold-500' :
                'bg-cream-200 text-charcoal-400'
              }`}>
                {ciclo.status === 'entregue' ? <Check size={16} /> :
                 ciclo.status === 'enviado' ? <Package size={16} /> :
                 <span className="text-xs font-medium">{ciclo.mes}</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal-700">
                  {new Date(ciclo.ano, ciclo.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
                {ciclo.codigoRastreio && (
                  <p className="text-xs text-charcoal-400">Rastreio: {ciclo.codigoRastreio}</p>
                )}
              </div>
              <Badge variant={
                ciclo.status === 'entregue' ? 'active' :
                ciclo.status === 'enviado' ? 'pending' :
                'inactive'
              }>
                {ciclo.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal cancelar */}
      <Modal
        open={modalCancelar}
        onClose={() => setModalCancelar(false)}
        title="Cancelar assinatura"
        size="sm"
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            title="Tem certeza?"
            message="Ao cancelar, você perderá acesso ao conteúdo exclusivo de membros na próxima cobrança."
          />
          <Select
            label="Motivo do cancelamento"
            options={[
              { value: 'custo', label: 'Custo elevado' },
              { value: 'qualidade', label: 'Qualidade insatisfatória' },
              { value: 'nao_usa', label: 'Não estou usando' },
              { value: 'pausa', label: 'Quero pausar por um tempo' },
              { value: 'outro', label: 'Outro motivo' },
            ]}
            placeholder="Selecione o motivo"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="danger"
              loading={cancelando}
              onClick={async () => {
                setCancelando(true);
                await new Promise(r => setTimeout(r, 1500));
                setCancelando(false);
                setModalCancelar(false);
              }}
            >
              Confirmar cancelamento
            </Button>
            <Button variant="ghost" onClick={() => setModalCancelar(false)}>
              Manter assinatura
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal trocar plano */}
      <Modal
        open={modalTrocarPlano}
        onClose={() => setModalTrocarPlano(false)}
        title="Trocar de plano"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-charcoal-500">
            A mudança de plano é efetiva na próxima cobrança.
          </p>
          <div className="space-y-3">
            {planos.filter(p => p.id !== assinatura.planoId).map(plano => (
              <label
                key={plano.id}
                className={`flex items-center gap-3 p-4 rounded-sm border-2 cursor-pointer transition-all ${
                  novoPlano === plano.id ? 'border-forest-500 bg-forest-50' : 'border-cream-300'
                }`}
              >
                <input
                  type="radio"
                  name="novoPlano"
                  value={plano.id}
                  checked={novoPlano === plano.id}
                  onChange={() => setNovoPlano(plano.id)}
                />
                <div>
                  <p className="font-medium text-charcoal-700 text-sm">{plano.nome}</p>
                  <p className="text-xs text-charcoal-400">R$ {plano.preco}/mês</p>
                </div>
              </label>
            ))}
          </div>
          <Button variant="primary" disabled={!novoPlano} className="w-full">
            Confirmar troca
          </Button>
        </div>
      </Modal>
    </div>
  );
}
