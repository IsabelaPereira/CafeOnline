import React from 'react';
import { CreditCard, Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card } from '../../components/ui';
import { useCliente } from '../../hooks/useCliente';
import { useClienteAssinaturas } from '../../hooks/useCliente';
import type { CobrancaAssinatura } from '../../types';

const BANDEIRA_LABEL: Record<string, string> = {
  visa:       'Visa',
  mastercard: 'Mastercard',
  amex:       'Amex',
  elo:        'Elo',
  hipercard:  'Hipercard',
  discover:   'Discover',
  diners:     'Diners',
};

const BANDEIRA_COR: Record<string, string> = {
  visa:       'bg-blue-600',
  mastercard: 'bg-red-500',
  amex:       'bg-indigo-600',
  elo:        'bg-yellow-500',
  hipercard:  'bg-red-700',
  discover:   'bg-orange-500',
  diners:     'bg-slate-500',
};

const COB_STATUS_ICON: Record<CobrancaAssinatura['status'], React.ReactNode> = {
  pago:      <CheckCircle size={13} className="text-forest-500" />,
  pendente:  <Clock       size={13} className="text-yellow-500" />,
  falhou:    <AlertCircle size={13} className="text-red-500"    />,
  estornado: <AlertCircle size={13} className="text-charcoal-400" />,
};

const COB_STATUS_LABEL: Record<CobrancaAssinatura['status'], string> = {
  pago:      'Pago',
  pendente:  'Pendente',
  falhou:    'Falhou',
  estornado: 'Estornado',
};

export function ClientPagamentos() {
  const { cliente, loading: cLoading }     = useCliente();
  const { assinaturas, loading: aLoading } = useClienteAssinaturas();

  const loading = cLoading || aLoading;

  // Cobranças de todas as assinaturas, ordenadas por data desc
  const cobrancas = assinaturas
    .flatMap(a =>
      a.historicoCobrancas.map(c => ({ ...c, planoNome: a.plano.nome }))
    )
    .sort((a, b) => b.data.localeCompare(a.data));

  const temCartao = !!(cliente?.stripeCardLast4);
  const bandeira  = (cliente?.stripeCardBrand ?? '').toLowerCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Pagamentos</h1>
        <p className="text-charcoal-400 text-sm mt-1">Método de pagamento e histórico de cobranças.</p>
      </div>

      {/* Aviso segurança */}
      <div className="flex items-center gap-3 p-4 bg-forest-50 border border-forest-100 rounded-sm text-sm text-forest-700">
        <Shield size={16} className="shrink-0" />
        Seus dados de pagamento são gerenciados com segurança pelo Stripe. Não armazenamos o número completo do cartão.
      </div>

      {/* Cartão salvo */}
      <Card>
        <h3 className="font-serif text-lg text-charcoal-700 mb-4">Método de Pagamento</h3>

        {temCartao ? (
          <div className="max-w-xs">
            <div className="relative bg-gradient-to-br from-charcoal-700 to-charcoal-600 rounded-lg p-5 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className={`inline-block text-xs font-bold px-2.5 py-1 rounded-sm mb-4 ${BANDEIRA_COR[bandeira] ?? 'bg-charcoal-500'}`}>
                  {BANDEIRA_LABEL[bandeira] ?? (cliente?.stripeCardBrand ?? 'Cartão')}
                </div>
                <p className="font-mono text-lg tracking-widest mb-3">
                  •••• •••• •••• {cliente!.stripeCardLast4}
                </p>
                {cliente?.stripeCardExpiry && (
                  <div className="text-right">
                    <p className="text-xs text-white/60 mb-0.5">Validade</p>
                    <p className="text-sm font-medium">{cliente.stripeCardExpiry}</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-charcoal-400 mt-3">
              Para trocar o cartão, assine novamente ou entre em contato com o suporte.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 py-6 text-charcoal-400">
            <CreditCard size={36} className="text-charcoal-200 shrink-0" />
            <div>
              <p className="font-medium text-charcoal-500">Nenhum cartão registrado</p>
              <p className="text-sm mt-0.5">
                O cartão é salvo automaticamente após a primeira compra ou assinatura.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Histórico de cobranças */}
      <Card>
        <h3 className="font-serif text-lg text-charcoal-700 mb-4">Histórico de Cobranças</h3>

        {cobrancas.length === 0 ? (
          <div className="flex items-center gap-4 py-6 text-charcoal-400">
            <Clock size={32} className="text-charcoal-200 shrink-0" />
            <div>
              <p className="font-medium text-charcoal-500">Sem cobranças ainda</p>
              <p className="text-sm mt-0.5">O histórico aparecerá aqui após a primeira cobrança da assinatura.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-cream-100">
            {cobrancas.map(cob => {
              const [ano, mes, dia] = cob.data.split('-');
              const dataFormatada = dia ? `${dia}/${mes}/${ano}` : cob.data;
              return (
                <div key={cob.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-charcoal-700 truncate">
                      Assinatura {cob.planoNome}
                    </p>
                    <p className="text-xs text-charcoal-400 mt-0.5">{dataFormatada}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="flex items-center gap-1 text-xs text-charcoal-500">
                      {COB_STATUS_ICON[cob.status]}
                      {COB_STATUS_LABEL[cob.status]}
                    </span>
                    <span className="font-serif text-charcoal-700 text-sm">
                      R$ {cob.valor.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
