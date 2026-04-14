import React, { useState } from 'react';
import { Package, Check, ChevronDown, Coffee, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, Modal, Select, Alert } from '../../components/ui';
import { useClienteAssinaturas, useClienteEnderecos } from '../../hooks/useCliente';
import { usePlanos } from '../../hooks/useAssinaturas';
import { trocarPlano, updateAssinaturaStatus } from '../../services/assinaturas.service';
import { updateClientePreferencias } from '../../services/clientes.service';
import type { Assinatura } from '../../types';

const STATUS_BADGE: Record<Assinatura['status'], React.ReactElement> = {
  ativa:        <Badge variant="active">Ativa</Badge>,
  pendente:     <Badge variant="pending">Pendente</Badge>,
  inadimplente: <Badge variant="cancelled">Inadimplente</Badge>,
  cancelada:    <Badge variant="inactive">Cancelada</Badge>,
  pausada:      <Badge variant="inactive">Pausada</Badge>,
};

export function ClientAssinaturas() {
  const { assinaturas, cliente, loading } = useClienteAssinaturas();
  const { data: planos } = usePlanos();
  const { enderecos } = useClienteEnderecos();

  // Which subscription's panels are open
  const [expandedHistorico, setExpandedHistorico] = useState<Record<string, boolean>>({});
  const [expandedCiclos,    setExpandedCiclos]    = useState<Record<string, boolean>>({});

  // Cancelar
  const [modalCancelar,    setModalCancelar]    = useState<string | null>(null); // assinatura.id
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando,       setCancelando]       = useState(false);

  // Trocar plano
  const [modalTrocarPlano, setModalTrocarPlano] = useState<string | null>(null);
  const [novoPlano,        setNovoPlano]        = useState('');
  const [trocando,         setTrocando]         = useState(false);

  // Alterar endereço
  const [modalEndereco,    setModalEndereco]    = useState<string | null>(null);
  const [novoEndereco,     setNovoEndereco]     = useState('');
  const [salvandoEnd,      setSalvandoEnd]      = useState(false);

  // Alterar preferência
  const [modalPref,        setModalPref]        = useState<Assinatura | null>(null);
  const [prefCafe,         setPrefCafe]         = useState<'grao' | 'moido'>('grao');
  const [prefMoagem,       setPrefMoagem]       = useState('');
  const [salvandoPref,     setSalvandoPref]     = useState(false);

  // Error/success
  const [erro, setErro] = useState('');

  const abrirCancelar = (id: string) => { setMotivoCancelamento(''); setModalCancelar(id); };

  const handleCancelar = async () => {
    if (!modalCancelar) return;
    setCancelando(true);
    setErro('');
    try {
      await updateAssinaturaStatus(modalCancelar, 'cancelada', motivoCancelamento || undefined);
      setModalCancelar(null);
    } catch {
      setErro('Não foi possível cancelar. Tente novamente.');
    } finally {
      setCancelando(false);
    }
  };

  const abrirTrocarPlano = (a: Assinatura) => {
    setNovoPlano('');
    setModalTrocarPlano(a.id);
  };

  const handleTrocarPlano = async () => {
    if (!modalTrocarPlano || !novoPlano) return;
    const assinatura = assinaturas.find(a => a.id === modalTrocarPlano);
    if (!assinatura) return;
    const planoSelecionado = planos.find(p => p.id === novoPlano);
    if (!planoSelecionado) return;
    setTrocando(true);
    setErro('');
    try {
      const novoTotal = planoSelecionado.preco + assinatura.frete;
      await trocarPlano(modalTrocarPlano, novoPlano, novoTotal);
      setModalTrocarPlano(null);
    } catch {
      setErro('Não foi possível trocar o plano. Tente novamente.');
    } finally {
      setTrocando(false);
    }
  };

  const abrirEndereco = (a: Assinatura) => {
    setNovoEndereco(a.enderecoId ?? '');
    setModalEndereco(a.id);
  };

  const handleSalvarEndereco = async () => {
    if (!modalEndereco || !novoEndereco) return;
    setSalvandoEnd(true);
    setErro('');
    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase
        .from('assinaturas')
        .update({ endereco_id: novoEndereco })
        .eq('id', modalEndereco);
      if (error) throw error;
      setModalEndereco(null);
    } catch {
      setErro('Não foi possível alterar o endereço. Tente novamente.');
    } finally {
      setSalvandoEnd(false);
    }
  };

  const abrirPreferencia = (a: Assinatura) => {
    setPrefCafe(a.preferenciaCafe);
    setPrefMoagem(a.tipoMoagem ?? '');
    setModalPref(a);
  };

  const handleSalvarPreferencia = async () => {
    if (!modalPref || !cliente) return;
    setSalvandoPref(true);
    setErro('');
    try {
      await updateClientePreferencias(
        cliente.id,
        prefCafe,
        prefCafe === 'moido' ? (prefMoagem || undefined) : undefined,
      );
      setModalPref(null);
    } catch {
      setErro('Não foi possível salvar a preferência. Tente novamente.');
    } finally {
      setSalvandoPref(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Minhas Assinaturas</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie seus planos e histórico de cobrança.</p>
        </div>
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  if (assinaturas.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Minhas Assinaturas</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie seus planos e histórico de cobrança.</p>
        </div>
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-earth-100 rounded-full flex items-center justify-center mb-4">
              <Coffee size={28} className="text-earth-400" />
            </div>
            <h2 className="font-serif text-xl text-charcoal-700 mb-2">Você ainda não tem uma assinatura</h2>
            <p className="text-charcoal-400 text-sm mb-6 max-w-xs">
              Assine o Clube Das Matas e receba café especial direto dos produtores todo mês.
            </p>
            <Link to="/assinar">
              <Button variant="primary">Assinar agora</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Minhas Assinaturas</h1>
        <p className="text-charcoal-400 text-sm mt-1">Gerencie seus planos e histórico de cobrança.</p>
      </div>

      {assinaturas.map(assinatura => (
        <div key={assinatura.id} className="space-y-4">
          {/* Header card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-serif text-2xl text-charcoal-700">{assinatura.plano.nome}</h2>
                  {STATUS_BADGE[assinatura.status]}
                </div>
                <p className="text-charcoal-400 text-sm">Desde {new Date(assinatura.dataInicio).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-3xl text-charcoal-700">R$ {assinatura.totalMensal.toFixed(2)}</p>
                <p className="text-xs text-charcoal-400">por mês (plano + frete)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Plano',          value: `R$ ${assinatura.plano.preco.toFixed(2)}` },
                { label: 'Frete',          value: assinatura.frete === 0 ? 'Grátis' : `R$ ${assinatura.frete.toFixed(2)}` },
                { label: 'Próx. cobrança', value: new Date(assinatura.proximaCobranca).toLocaleDateString('pt-BR') },
                { label: 'Próx. envio',    value: new Date(assinatura.proximoEnvio).toLocaleDateString('pt-BR') },
                {
                  label: 'Café',
                  value: assinatura.preferenciaCafe === 'grao'
                    ? 'Grão inteiro'
                    : assinatura.tipoMoagem
                      ? `Moído — ${({ fino: 'fino', medio: 'médio', grosso: 'grosso', extraGrosso: 'extra grosso' } as Record<string,string>)[assinatura.tipoMoagem] ?? assinatura.tipoMoagem}`
                      : 'Moído',
                },
              ].map(info => (
                <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                  <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                  <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-cream-200 pt-5">
              <Button variant="secondary" size="sm" onClick={() => abrirTrocarPlano(assinatura)}>
                Trocar plano
              </Button>
              <Button variant="ghost" size="sm" onClick={() => abrirEndereco(assinatura)}>
                Alterar endereço
              </Button>
              <Button variant="ghost" size="sm" onClick={() => abrirPreferencia(assinatura)}>
                Alterar preferência
              </Button>
              {assinatura.status !== 'cancelada' && (
                <button
                  onClick={() => abrirCancelar(assinatura.id)}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          </Card>

          {/* Histórico de cobranças */}
          <Card padding={false}>
            <button
              onClick={() => setExpandedHistorico(prev => ({ ...prev, [assinatura.id]: !prev[assinatura.id] }))}
              className="w-full flex items-center justify-between px-6 py-4"
            >
              <h3 className="font-serif text-lg text-charcoal-700">Histórico de cobranças</h3>
              <ChevronDown
                size={18}
                className={`text-charcoal-400 transition-transform ${expandedHistorico[assinatura.id] ? 'rotate-180' : ''}`}
              />
            </button>
            {expandedHistorico[assinatura.id] && (
              <div className="border-t border-cream-200 overflow-x-auto">
                {assinatura.historicoCobrancas.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-charcoal-400">Nenhum registro encontrado.</p>
                ) : (
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
                            <Badge variant={cob.status === 'pago' ? 'active' : cob.status === 'pendente' ? 'pending' : 'cancelled'}>
                              {cob.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-sm text-charcoal-500">{cob.tentativas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Card>

          {/* Ciclos / Edições */}
          {assinatura.ciclos.length > 0 && (
            <Card padding={false}>
              <button
                onClick={() => setExpandedCiclos(prev => ({ ...prev, [assinatura.id]: !prev[assinatura.id] }))}
                className="w-full flex items-center justify-between px-6 py-4"
              >
                <h3 className="font-serif text-lg text-charcoal-700">Edições do Clube</h3>
                <ChevronDown
                  size={18}
                  className={`text-charcoal-400 transition-transform ${expandedCiclos[assinatura.id] ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedCiclos[assinatura.id] && (
                <div className="border-t border-cream-200 px-6 py-4 space-y-3">
                  {assinatura.ciclos.map(ciclo => (
                    <div key={ciclo.id} className="flex items-center gap-4 p-4 bg-cream-50 rounded-sm">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        ciclo.status === 'entregue' ? 'bg-forest-100 text-forest-500' :
                        ciclo.status === 'enviado'  ? 'bg-gold-100 text-gold-500' :
                        'bg-cream-200 text-charcoal-400'
                      }`}>
                        {ciclo.status === 'entregue' ? <Check size={16} /> :
                         ciclo.status === 'enviado'  ? <Package size={16} /> :
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
                      <Badge variant={ciclo.status === 'entregue' ? 'active' : ciclo.status === 'enviado' ? 'pending' : 'inactive'}>
                        {ciclo.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      ))}

      {/* ── Modal cancelar ─────────────────────────────────────────────────── */}
      <Modal
        open={!!modalCancelar}
        onClose={() => setModalCancelar(null)}
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
            value={motivoCancelamento}
            onChange={e => setMotivoCancelamento(e.target.value)}
            options={[
              { value: 'custo',      label: 'Custo elevado' },
              { value: 'qualidade',  label: 'Qualidade insatisfatória' },
              { value: 'nao_usa',    label: 'Não estou usando' },
              { value: 'pausa',      label: 'Quero pausar por um tempo' },
              { value: 'outro',      label: 'Outro motivo' },
            ]}
            placeholder="Selecione o motivo"
          />
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="danger" loading={cancelando} onClick={handleCancelar}>
              Confirmar cancelamento
            </Button>
            <Button variant="ghost" onClick={() => setModalCancelar(null)}>
              Manter assinatura
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal trocar plano ─────────────────────────────────────────────── */}
      <Modal
        open={!!modalTrocarPlano}
        onClose={() => setModalTrocarPlano(null)}
        title="Trocar de plano"
        size="sm"
      >
        {(() => {
          const assinatura = assinaturas.find(a => a.id === modalTrocarPlano);
          if (!assinatura) return null;
          const planoAtual = assinatura.planoId;
          return (
            <div className="space-y-4">
              <p className="text-sm text-charcoal-500">
                A mudança de plano é efetiva na próxima cobrança.
              </p>
              <div className="space-y-3">
                {planos.filter(p => p.id !== planoAtual && p.ativo).map(plano => (
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
                      <p className="text-xs text-charcoal-400">
                        R$ {plano.preco.toFixed(2)}/mês + frete = R$ {(plano.preco + assinatura.frete).toFixed(2)}/mês
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {erro && <p className="text-sm text-red-500">{erro}</p>}
              <Button
                variant="primary"
                disabled={!novoPlano}
                loading={trocando}
                className="w-full"
                onClick={handleTrocarPlano}
              >
                Confirmar troca
              </Button>
            </div>
          );
        })()}
      </Modal>

      {/* ── Modal alterar endereço ─────────────────────────────────────────── */}
      <Modal
        open={!!modalEndereco}
        onClose={() => setModalEndereco(null)}
        title="Alterar endereço de entrega"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-charcoal-500">
            Escolha o endereço para as próximas entregas desta assinatura.
          </p>
          <div className="space-y-3">
            {enderecos.map(end => (
              <label
                key={end.id}
                className={`flex items-start gap-3 p-4 rounded-sm border-2 cursor-pointer transition-all ${
                  novoEndereco === end.id ? 'border-forest-500 bg-forest-50' : 'border-cream-300'
                }`}
              >
                <input
                  type="radio"
                  name="novoEndereco"
                  value={end.id}
                  checked={novoEndereco === end.id}
                  onChange={() => setNovoEndereco(end.id)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-charcoal-700 text-sm flex items-center gap-1">
                    <MapPin size={13} />
                    {end.apelido || 'Endereço'}
                    {end.padrao && <span className="ml-1 text-xs text-forest-500">(padrão)</span>}
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {end.logradouro}, {end.numero}{end.complemento ? `, ${end.complemento}` : ''} — {end.bairro}, {end.cidade}/{end.estado} — {end.cep}
                  </p>
                </div>
              </label>
            ))}
            {enderecos.length === 0 && (
              <p className="text-sm text-charcoal-400 text-center py-4">
                Nenhum endereço cadastrado.{' '}
                <Link to="/cliente/perfil" className="text-forest-500 underline">Adicionar endereço</Link>
              </p>
            )}
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              disabled={!novoEndereco || enderecos.length === 0}
              loading={salvandoEnd}
              onClick={handleSalvarEndereco}
            >
              Salvar endereço
            </Button>
            <Button variant="ghost" onClick={() => setModalEndereco(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal alterar preferência ──────────────────────────────────────── */}
      <Modal
        open={!!modalPref}
        onClose={() => setModalPref(null)}
        title="Alterar preferência de café"
        size="sm"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs text-charcoal-400 mb-2 uppercase tracking-wider font-medium">Formato do café</p>
            <div className="grid grid-cols-2 gap-3">
              {(['grao', 'moido'] as const).map(opt => (
                <label
                  key={opt}
                  className={`flex flex-col items-center gap-2 p-4 rounded-sm border-2 cursor-pointer transition-all ${
                    prefCafe === opt ? 'border-forest-500 bg-forest-50' : 'border-cream-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="prefCafe"
                    value={opt}
                    checked={prefCafe === opt}
                    onChange={() => { setPrefCafe(opt); if (opt === 'grao') setPrefMoagem(''); }}
                    className="sr-only"
                  />
                  <Coffee size={22} className={prefCafe === opt ? 'text-forest-500' : 'text-charcoal-400'} />
                  <span className="text-sm font-medium text-charcoal-700 capitalize">
                    {opt === 'grao' ? 'Grão inteiro' : 'Moído'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {prefCafe === 'moido' && (
            <Select
              label="Tipo de moagem"
              value={prefMoagem}
              onChange={e => setPrefMoagem(e.target.value)}
              options={[
                { value: 'fino',        label: 'Fino (espresso)' },
                { value: 'medio',       label: 'Médio (coado, prensa)' },
                { value: 'grosso',      label: 'Grosso (cold brew)' },
                { value: 'extraGrosso', label: 'Extra grosso' },
              ]}
              placeholder="Selecione o tipo de moagem"
            />
          )}

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="flex gap-3 pt-1">
            <Button
              variant="primary"
              loading={salvandoPref}
              onClick={handleSalvarPreferencia}
            >
              Salvar preferência
            </Button>
            <Button variant="ghost" onClick={() => setModalPref(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
