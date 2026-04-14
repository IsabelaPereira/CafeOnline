import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, ChevronRight, Coffee, Package, CreditCard, ArrowRight } from 'lucide-react';
import { Input, Select, Button, Alert } from '../../components/ui';
import { usePlanos } from '../../hooks/useAssinaturas';
import { createLead } from '../../services/leads.service';

type Step = 'contato' | 'dados' | 'endereco' | 'preferencias' | 'plano' | 'pagamento' | 'confirmado';

const stepLabels: Record<Step, string> = {
  contato: 'Contato',
  dados: 'Dados pessoais',
  endereco: 'Endereço',
  preferencias: 'Preferências',
  plano: 'Plano',
  pagamento: 'Pagamento',
  confirmado: 'Confirmado',
};

const stepOrder: Step[] = ['contato', 'dados', 'endereco', 'preferencias', 'plano', 'pagamento', 'confirmado'];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = stepOrder.indexOf(current);
  const visibleSteps = stepOrder.filter(s => s !== 'confirmado');
  return (
    <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
      {visibleSteps.map((step, i) => {
        const idx = stepOrder.indexOf(step);
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div className={`h-px w-8 ${done || active ? 'bg-forest-400' : 'bg-cream-300'}`} />
            )}
            <div className={`flex items-center gap-1.5`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                done
                  ? 'bg-forest-500 text-white'
                  : active
                    ? 'bg-earth-400 text-white'
                    : 'bg-cream-200 text-charcoal-400'
              }`}>
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className={`hidden sm:block text-xs ${active ? 'text-charcoal-700 font-medium' : 'text-charcoal-400'}`}>
                {stepLabels[step]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function AssinarPage() {
  const [searchParams] = useSearchParams();
  const planoInicial = searchParams.get('plano') || '';
  const { data: planos } = usePlanos();

  const [step, setStep] = useState<Step>('contato');
  const [loading, setLoading] = useState(false);
  const [leadSalvo, setLeadSalvo] = useState(false);

  const [contato, setContato] = useState({ email: '', telefone: '' });
  const [dados, setDados] = useState({ nome: '', cpf: '', nascimento: '' });
  const [endereco, setEndereco] = useState({
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
  });
  const [preferencias, setPreferencias] = useState({
    tipo: 'grao' as 'grao' | 'moido',
    moagem: 'medio',
  });
  const [planoSelecionado, setPlanoSelecionado] = useState(planoInicial);
  const [pagamento, setPagamento] = useState({
    numero: '', validade: '', cvv: '', nome: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const planoObj = planos.find(p => p.id === planoSelecionado);
  const freteEstimado = 18.90;

  const salvarLead = async () => {
    if (!leadSalvo && contato.email && contato.telefone) {
      // Simular salvamento do lead
      await new Promise(r => setTimeout(r, 300));
      setLeadSalvo(true);
      console.log('Lead salvo:', { email: contato.email, telefone: contato.telefone, etapa: 'checkout_iniciado' });
    }
  };

  const nextStep = async () => {
    setLoading(true);
    if (step === 'contato') {
      if (!contato.email || !contato.telefone) {
        setErrors({ email: !contato.email ? 'E-mail obrigatório' : '', telefone: !contato.telefone ? 'Telefone obrigatório' : '' });
        setLoading(false);
        return;
      }
      await salvarLead();
    }
    await new Promise(r => setTimeout(r, 500));
    setLoading(false);
    const idx = stepOrder.indexOf(step);
    setStep(stepOrder[idx + 1]);
    setErrors({});
  };

  const prevStep = () => {
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  };

  const handleFinalizar = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    setStep('confirmado');
  };

  if (step === 'confirmado') {
    return (
      <div className="pt-20 min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-sm border border-cream-200 p-10 text-center">
          <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-forest-500" />
          </div>
          <h1 className="font-serif text-3xl text-charcoal-700 mb-3">Bem-vindo ao Clube!</h1>
          <p className="text-charcoal-500 mb-2">
            Sua assinatura do plano <strong>{planoObj?.nome}</strong> foi confirmada.
          </p>
          <p className="text-charcoal-500 mb-8">
            Você receberá um e-mail de confirmação em <strong>{contato.email}</strong> com todos os detalhes.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/cliente"
              className="flex items-center justify-center gap-2 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors"
            >
              Acessar minha conta
              <ArrowRight size={14} />
            </Link>
            <Link to="/" className="text-sm text-charcoal-400 hover:text-charcoal-600">
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-cream-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 bg-forest-500 rounded-sm flex items-center justify-center">
              <Coffee size={18} className="text-cream-100" />
            </div>
            <span className="font-serif text-xl text-charcoal-700">Das Matas</span>
          </div>
          <h1 className="font-serif text-3xl text-charcoal-700">Assinar o Clube</h1>
          <p className="text-charcoal-500 text-sm mt-2">Preencha os dados abaixo para começar sua jornada.</p>
        </div>

        <StepIndicator current={step} />

        <div className="bg-white rounded-sm border border-cream-200 p-8">
          {/* STEP 1: CONTATO */}
          {step === 'contato' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Seus dados de contato</h2>
                <p className="text-sm text-charcoal-400">Esses dados serão usados para comunicação e envio da assinatura.</p>
              </div>
              <Input
                label="E-mail"
                type="email"
                required
                value={contato.email}
                onChange={e => setContato({ ...contato, email: e.target.value })}
                error={errors.email}
                placeholder="seu@email.com"
              />
              <Input
                label="Telefone / WhatsApp"
                required
                value={contato.telefone}
                onChange={e => setContato({ ...contato, telefone: e.target.value })}
                error={errors.telefone}
                placeholder="(11) 99999-9999"
              />
              <Alert type="info" message="Seus dados ficam seguros. Utilizamos estas informações apenas para comunicação sobre sua assinatura." />
            </div>
          )}

          {/* STEP 2: DADOS */}
          {step === 'dados' && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Dados pessoais</h2>
              <Input
                label="Nome completo"
                required
                value={dados.nome}
                onChange={e => setDados({ ...dados, nome: e.target.value })}
                placeholder="Seu nome completo"
              />
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="CPF"
                  value={dados.cpf}
                  onChange={e => setDados({ ...dados, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
                <Input
                  label="Data de nascimento"
                  type="date"
                  value={dados.nascimento}
                  onChange={e => setDados({ ...dados, nascimento: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 3: ENDEREÇO */}
          {step === 'endereco' && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Endereço de entrega</h2>
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="CEP"
                  required
                  value={endereco.cep}
                  onChange={e => setEndereco({ ...endereco, cep: e.target.value })}
                  placeholder="00000-000"
                />
                <div />
              </div>
              <Input
                label="Logradouro"
                required
                value={endereco.logradouro}
                onChange={e => setEndereco({ ...endereco, logradouro: e.target.value })}
                placeholder="Rua, Avenida..."
              />
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="Número"
                  required
                  value={endereco.numero}
                  onChange={e => setEndereco({ ...endereco, numero: e.target.value })}
                  placeholder="Ex: 100"
                />
                <Input
                  label="Complemento"
                  value={endereco.complemento}
                  onChange={e => setEndereco({ ...endereco, complemento: e.target.value })}
                  placeholder="Apto, sala..."
                />
              </div>
              <Input
                label="Bairro"
                required
                value={endereco.bairro}
                onChange={e => setEndereco({ ...endereco, bairro: e.target.value })}
                placeholder="Bairro"
              />
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="Cidade"
                  required
                  value={endereco.cidade}
                  onChange={e => setEndereco({ ...endereco, cidade: e.target.value })}
                  placeholder="Cidade"
                />
                <Select
                  label="Estado"
                  value={endereco.estado}
                  onChange={e => setEndereco({ ...endereco, estado: e.target.value })}
                  placeholder="UF"
                  options={['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(s => ({ value: s, label: s }))}
                />
              </div>
            </div>
          )}

          {/* STEP 4: PREFERÊNCIAS */}
          {step === 'preferencias' && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Preferências do café</h2>
              <div>
                <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-3">Como você prefere receber?</p>
                <div className="grid grid-cols-2 gap-4">
                  {(['grao', 'moido'] as const).map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setPreferencias({ ...preferencias, tipo })}
                      className={`p-5 rounded-sm border-2 text-left transition-all ${
                        preferencias.tipo === tipo
                          ? 'border-forest-500 bg-forest-50'
                          : 'border-cream-300 hover:border-earth-300'
                      }`}
                    >
                      <Package size={24} className={`mb-2 ${preferencias.tipo === tipo ? 'text-forest-500' : 'text-charcoal-300'}`} />
                      <p className="font-medium text-charcoal-700">{tipo === 'grao' ? 'Em Grão' : 'Moído'}</p>
                      <p className="text-xs text-charcoal-400 mt-1">
                        {tipo === 'grao'
                          ? 'Máximo frescor. Ideal para quem tem moedor.'
                          : 'Prático e conveniente. Pronto para usar.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {preferencias.tipo === 'moido' && (
                <Select
                  label="Tipo de moagem"
                  value={preferencias.moagem}
                  onChange={e => setPreferencias({ ...preferencias, moagem: e.target.value })}
                  options={[
                    { value: 'fino', label: 'Fina — Espresso e Moka' },
                    { value: 'medio', label: 'Média — Coador e AeroPress' },
                    { value: 'grosso', label: 'Grossa — Prensa Francesa' },
                    { value: 'extraGrosso', label: 'Extra Grossa — Cold Brew' },
                  ]}
                />
              )}
            </div>
          )}

          {/* STEP 5: PLANO */}
          {step === 'plano' && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Escolha seu plano</h2>
              {planos.map(plano => (
                <label
                  key={plano.id}
                  className={`flex items-start gap-4 p-5 rounded-sm border-2 cursor-pointer transition-all ${
                    planoSelecionado === plano.id
                      ? 'border-forest-500 bg-forest-50'
                      : 'border-cream-300 hover:border-earth-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="plano"
                    value={plano.id}
                    checked={planoSelecionado === plano.id}
                    onChange={() => setPlanoSelecionado(plano.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif text-lg text-charcoal-700">{plano.nome}</span>
                      {plano.destaque && (
                        <span className="px-2 py-0.5 bg-forest-500 text-white text-xs rounded-full">Popular</span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-500 mb-2">{plano.descricao}</p>
                    <p className="font-display text-2xl text-charcoal-700">R$ {plano.preco}<span className="text-sm font-sans text-charcoal-400">/mês</span></p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* STEP 6: PAGAMENTO */}
          {step === 'pagamento' && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Pagamento</h2>

              {/* Resumo */}
              <div className="bg-cream-100 rounded-sm p-5 border border-cream-200">
                <p className="text-sm font-medium text-charcoal-600 mb-3">Resumo da assinatura</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">{planoObj?.nome}</span>
                    <span className="text-charcoal-700">R$ {planoObj?.preco.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Frete estimado</span>
                    <span className="text-charcoal-700">R$ {freteEstimado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-cream-200">
                    <span className="font-medium text-charcoal-700">Total mensal</span>
                    <span className="font-serif text-lg text-charcoal-700">
                      R$ {((planoObj?.preco ?? 0) + freteEstimado).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={16} className="text-charcoal-400" />
                <span className="text-sm font-medium text-charcoal-600">Cartão de crédito</span>
              </div>

              <Input
                label="Número do cartão"
                value={pagamento.numero}
                onChange={e => setPagamento({ ...pagamento, numero: e.target.value })}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
              <Input
                label="Nome no cartão"
                value={pagamento.nome}
                onChange={e => setPagamento({ ...pagamento, nome: e.target.value })}
                placeholder="NOME COMO NO CARTÃO"
              />
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="Validade"
                  value={pagamento.validade}
                  onChange={e => setPagamento({ ...pagamento, validade: e.target.value })}
                  placeholder="MM/AA"
                  maxLength={5}
                />
                <Input
                  label="CVV"
                  value={pagamento.cvv}
                  onChange={e => setPagamento({ ...pagamento, cvv: e.target.value })}
                  placeholder="000"
                  maxLength={4}
                />
              </div>

              <p className="text-xs text-charcoal-400 flex items-center gap-1">
                🔒 Pagamento seguro via Pagar.me / Stripe. Seus dados são criptografados.
              </p>
            </div>
          )}

          {/* NAVIGATION */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-cream-200">
            {step !== 'contato' ? (
              <button
                onClick={prevStep}
                className="text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors"
              >
                ← Voltar
              </button>
            ) : (
              <div />
            )}
            {step === 'pagamento' ? (
              <Button
                variant="primary"
                size="lg"
                loading={loading}
                onClick={handleFinalizar}
              >
                <Check size={16} />
                Confirmar assinatura
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={loading}
                onClick={nextStep}
              >
                Continuar
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-charcoal-400 mt-6">
          Sem taxa de adesão · Cancele quando quiser · Dados protegidos
        </p>
      </div>
    </div>
  );
}
