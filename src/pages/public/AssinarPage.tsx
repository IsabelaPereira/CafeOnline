import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Check, ChevronRight, Coffee, Package, CreditCard, Lock,
  Truck, MapPin, Eye, EyeOff, Plus, Home, Store,
} from 'lucide-react';
import { Input, Select, Button, Alert } from '../../components/ui';
import { usePlanos } from '../../hooks/useAssinaturas';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createCheckoutSession } from '../../services/stripe.service';
import { upsertLeadByEmail, updateLeadEtapa } from '../../services/leads.service';
import { calcularFrete, buscarEnderecoCep, RETIRADA_OPCAO } from '../../services/frete.service';
import { getClienteByUserId, updateClienteStripeCustomerId } from '../../services/clientes.service';
import type { Endereco } from '../../types';
import type { FreteOpcao } from '../../services/frete.service';

// ─── Types ────────────────────────────────────────────────────────────────────
type FlowStep = 'plano' | 'email' | 'dados' | 'preferencias' | 'endereco' | 'pagamento';

const STEPS: FlowStep[] = ['plano', 'email', 'dados', 'preferencias', 'endereco', 'pagamento'];
const STEP_LABELS: Record<FlowStep, string> = {
  plano: 'Plano', email: 'Contato', dados: 'Dados',
  preferencias: 'Preferências', endereco: 'Endereço', pagamento: 'Pagamento',
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, skipped }: { current: FlowStep; skipped: Set<FlowStep> }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-1.5 mb-10 flex-wrap">
      {STEPS.map((step, i) => {
        const idx   = STEPS.indexOf(step);
        const done  = idx < currentIdx || skipped.has(step);
        const active = idx === currentIdx;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div className={`h-px w-6 ${done || active ? 'bg-forest-400' : 'bg-cream-300'}`} />
            )}
            <div className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                done     ? 'bg-forest-500 text-white'
                : active ? 'bg-earth-400 text-white'
                         : 'bg-cream-200 text-charcoal-400'
              }`}>
                {done ? <Check size={11} /> : i + 1}
              </div>
              <span className={`hidden sm:block text-xs ${active ? 'text-charcoal-700 font-medium' : 'text-charcoal-400'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AssinarPage() {
  const [searchParams] = useSearchParams();
  const planoInicial = searchParams.get('plano') ?? '';
  const cancelado    = searchParams.get('cancelado') === 'true';

  const { data: planos } = usePlanos();
  const { user } = useAuth();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<FlowStep>(planoInicial ? 'email' : 'plano');
  const [skipped, setSkipped] = useState<Set<FlowStep>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [alerta,  setAlerta]  = useState('');

  // ── Plan ───────────────────────────────────────────────────────────────────
  const [planoId, setPlanoId] = useState(planoInicial);

  // ── Auth / identity ────────────────────────────────────────────────────────
  const [email,         setEmail]         = useState('');
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists,   setEmailExists]   = useState(false);
  const [senha,         setSenha]         = useState('');
  const [senhaVisivel,  setSenhaVisivel]  = useState(false);
  const [userId,        setUserId]        = useState<string | null>(null);
  const [clienteId,     setClienteId]     = useState<string | null>(null);
  const [leadId,        setLeadId]        = useState<string | null>(null);
  const [isNewUser,     setIsNewUser]     = useState(true);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);

  // ── Dados (step 3) ─────────────────────────────────────────────────────────
  const [dados, setDados] = useState({ nome: '', celular: '', cpf: '', senhaNovo: '', confirmarSenha: '' });
  const [senhaNovVisivel, setSenhaNovVisivel] = useState(false);

  // ── Preferências (step 4) ──────────────────────────────────────────────────
  const [preferencias, setPreferencias] = useState<{ tipo: 'grao' | 'moido'; moagem: string }>({
    tipo: 'grao', moagem: 'medio',
  });

  // ── Endereço + frete (step 5) ──────────────────────────────────────────────
  const [enderecosSalvos,      setEnderecosSalvos]      = useState<Endereco[]>([]);
  const [enderecoSelecionadoId, setEnderecoSelecionadoId] = useState<string | 'novo' | null>(null);
  const [endereco, setEndereco] = useState({
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  });
  const [cepLoading,   setCepLoading]   = useState(false);
  const [freteOpcoes,  setFreteOpcoes]  = useState<FreteOpcao[]>([RETIRADA_OPCAO]);
  const [freteId,      setFreteId]      = useState<string | null>('retirada');
  const [freteLoading, setFreteLoading] = useState(false);

  // Evita duplicatas em retentativas de pagamento
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);

  const planoObj         = planos.find(p => p.id === planoId);
  const freteSelecionado = freteOpcoes.find(f => f.id === freteId);

  // ── Auto-select first plan ─────────────────────────────────────────────────
  useEffect(() => {
    if (!planoId && planos.length > 0) setPlanoId(planos[0].id);
  }, [planos, planoId]);

  // ── Pre-fill existing user data (só quando não há e-mail digitado manualmente) ──
  useEffect(() => {
    // Não interfere se o usuário já digitou um e-mail diferente da conta logada
    if (!user || userId) return;
    if (email && email !== user.email) return;
    setUserId(user.id);
    setEmail(user.email);
    setEmailExists(true);
    setIsNewUser(false);

    // Só pré-preenche o nome se for um nome real (não o username auto-gerado do e-mail)
    const emailUsername = (user.email ?? '').split('@')[0].toLowerCase();
    const nomeReal = (user.name && user.name.toLowerCase() !== emailUsername) ? user.name : '';
    if (nomeReal) setDados(d => ({ ...d, nome: nomeReal }));

    getClienteByUserId(user.id).then(cliente => {
      if (cliente) {
        setClienteId(cliente.id);
        setStripeCustomerId((cliente as any).stripe_customer_id ?? null);

        // Pre-fill dados com informações salvas
        setDados(d => ({
          ...d,
          nome:    nomeReal,
          celular: cliente.phone ?? '',
          cpf:     cliente.cpf ?? '',
        }));

        // Pre-fill preferências salvas
        if (cliente.preferenciaCafe) {
          setPreferencias({
            tipo:   cliente.preferenciaCafe,
            moagem: cliente.tipoMoagem ?? 'medio',
          });
        }

        // Carregar endereços salvos
        if (cliente.enderecos?.length > 0) {
          setEnderecosSalvos(cliente.enderecos);
          const padrao = cliente.enderecos.find(e => e.padrao) ?? cliente.enderecos[0];
          selecionarEnderecoSalvo(padrao, cliente.enderecos);
        }

        // Navegar para o passo correto se dados já completos
        const temDados = !!(nomeReal && cliente.phone);
        if (temDados && planoId) {
          skipTo('preferencias', new Set<FlowStep>(['email', 'dados']));
          return;
        }
      }

      // Se não tem cliente ou faltam dados, vai para 'dados'
      if (planoId) {
        skipTo('dados', new Set<FlowStep>(['email']));
      }
    }).catch(() => {});
  }, [user]);

  // ── Handle Stripe cancel return ────────────────────────────────────────────
  useEffect(() => {
    if (!cancelado) return;
    const storedLead = sessionStorage.getItem('dsmatas_lead_id');
    if (storedLead) {
      updateLeadEtapa(storedLead, 'pagamento_pendente').catch(() => {});
      sessionStorage.removeItem('dsmatas_lead_id');
      sessionStorage.removeItem('dsmatas_assinatura_id');
    }
    setAlerta('Seu pagamento não foi concluído. Você pode tentar novamente quando quiser.');
    setStep('pagamento');
  }, [cancelado]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function skipTo(target: FlowStep, toSkip: Set<FlowStep>) {
    setSkipped(toSkip);
    setStep(target);
  }

  async function salvarLead(
    etapa: Parameters<typeof upsertLeadByEmail>[0]['etapa'],
    extra?: { nome?: string; telefone?: string },
  ) {
    try {
      const id = await upsertLeadByEmail({
        email, etapa,
        nome:          extra?.nome,
        telefone:      extra?.telefone,
        origem:        'checkout',
        interesse:     'Clube de assinatura',
        planoDesejado: planoId || undefined,
      });
      setLeadId(id);
      return id;
    } catch { return null; }
  }

  function err(field: string, msg: string) {
    setErrors(e => ({ ...e, [field]: msg }));
  }

  /** Preenche o formulário e calcula o frete a partir de um endereço salvo */
  function selecionarEnderecoSalvo(end: Endereco, lista?: Endereco[]) {
    const list = lista ?? enderecosSalvos;
    setEnderecoSelecionadoId(end.id);
    setEndereco({
      cep:         end.cep,
      logradouro:  end.logradouro,
      numero:      end.numero,
      complemento: end.complemento ?? '',
      bairro:      end.bairro,
      cidade:      end.cidade,
      estado:      end.estado,
    });
    // Calcula frete automaticamente
    const cepLimpo = end.cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setFreteLoading(true);
      setFreteOpcoes([]);
      setFreteId(null);
      calcularFrete(cepLimpo)
        .then(opcoes => {
          setFreteOpcoes([RETIRADA_OPCAO, ...opcoes]);
          if (opcoes.length > 0) setFreteId(opcoes[0].id);
        })
        .catch(() => {})
        .finally(() => setFreteLoading(false));
    }
    void list; // suppress unused warning
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  // PLANO → EMAIL
  const handleSelecionarPlano = () => {
    if (!planoId) { err('plano', 'Selecione um plano para continuar.'); return; }
    setErrors({});
    setStep('email');
  };

  // EMAIL: verificar se e-mail existe
  const handleVerificarEmail = async () => {
    setErrors({});
    if (!email.trim()) { err('email', 'Informe seu e-mail para continuar.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err('email', 'Este não parece um e-mail válido. Verifique e tente novamente.'); return;
    }

    setEmailChecking(true);
    const tempPass = crypto.randomUUID();
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: tempPass,
      options: { data: { name: email.split('@')[0] } },
    });
    setEmailChecking(false);

    const jaExiste =
      signUpErr?.code === 'user_already_exists' ||
      signUpErr?.message?.toLowerCase().includes('already registered') ||
      signUpErr?.message?.toLowerCase().includes('already been registered');

    if (jaExiste) {
      setEmailExists(true);
      setIsNewUser(false);
      return;
    }
    if (signUpErr) {
      err('email', signUpErr.message?.toLowerCase().includes('rate')
        ? 'Muitas tentativas. Aguarde alguns segundos e tente novamente.'
        : signUpErr.message);
      return;
    }

    // Novo usuário — reseta qualquer dado herdado de sessão anterior e avança
    setUserId(signUpData.user?.id ?? null);
    setClienteId(null);
    setStripeCustomerId(null);
    setEnderecosSalvos([]);
    setEnderecoSelecionadoId(null);
    setDados({ nome: '', celular: '', cpf: '', senhaNovo: '', confirmarSenha: '' });
    setPreferencias({ tipo: 'grao', moagem: 'medio' });
    setIsNewUser(true);
    await salvarLead('checkout_iniciado');
    setErrors({});
    setStep('dados');
  };

  // EMAIL: entrar com conta existente
  const handleLogin = async () => {
    setErrors({});
    if (!senha) { err('senha', 'Informe sua senha para continuar.'); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password: senha,
    });
    setLoading(false);

    if (error) {
      err('senha', 'Senha incorreta. Verifique e tente novamente, ou use "Esqueci minha senha".');
      return;
    }

    setUserId(data.user.id);
    await salvarLead('checkout_iniciado');

    // Busca nome real da tabela profiles (user_metadata pode conter username auto-gerado)
    const { data: profileRow } = await supabase.from('profiles').select('name').eq('id', data.user.id).single();
    const emailUsername = email.split('@')[0].toLowerCase();
    const nomePerfil = (profileRow?.name && profileRow.name.toLowerCase() !== emailUsername)
      ? profileRow.name
      : '';
    if (nomePerfil) setDados(d => ({ ...d, nome: nomePerfil }));

    const cliente = await getClienteByUserId(data.user.id).catch(() => null);
    if (cliente) {
      setClienteId(cliente.id);
      setStripeCustomerId((cliente as any).stripe_customer_id ?? null);

      // Pre-fill dados com informações salvas
      setDados(d => ({ ...d, nome: nomePerfil, celular: cliente.phone ?? '', cpf: cliente.cpf ?? '' }));

      // Pre-fill preferências
      if (cliente.preferenciaCafe) {
        setPreferencias({ tipo: cliente.preferenciaCafe, moagem: cliente.tipoMoagem ?? 'medio' });
      }

      // Carregar endereços salvos
      if (cliente.enderecos?.length > 0) {
        setEnderecosSalvos(cliente.enderecos);
        const padrao = cliente.enderecos.find(e => e.padrao) ?? cliente.enderecos[0];
        selecionarEnderecoSalvo(padrao, cliente.enderecos);
      }

      const temDados = !!(nomePerfil && cliente.phone);
      if (temDados) {
        skipTo('preferencias', new Set<FlowStep>(['dados']));
        return;
      }
    }
    setErrors({});
    setStep('dados');
  };

  // DADOS → PREFERENCIAS
  const handleDados = async () => {
    const errs: Record<string, string> = {};
    if (!dados.nome.trim())    errs.nome    = 'Precisamos do seu nome completo.';
    if (!dados.celular.trim()) errs.celular = 'Informe um celular para atualizações do pedido.';
    else if (dados.celular.replace(/\D/g, '').length < 10)
      errs.celular = 'Celular inválido. Use o formato (11) 99999-9999.';

    if (isNewUser) {
      if (!dados.senhaNovo)                errs.senhaNovo      = 'Crie uma senha para acessar sua conta.';
      else if (dados.senhaNovo.length < 8) errs.senhaNovo      = 'A senha deve ter ao menos 8 caracteres.';
      else if (dados.senhaNovo !== dados.confirmarSenha)
                                           errs.confirmarSenha = 'As senhas não conferem. Verifique e tente novamente.';
    }

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      if (isNewUser && dados.senhaNovo) await supabase.auth.updateUser({ password: dados.senhaNovo });
      await supabase.from('profiles').update({ name: dados.nome.trim() }).eq('id', userId);

      let theClienteId = clienteId;
      if (theClienteId) {
        await supabase.from('clientes').update({
          phone: dados.celular.replace(/\D/g, ''), cpf: dados.cpf || null,
        }).eq('id', theClienteId);
      } else {
        const { data: c, error: cErr } = await supabase.from('clientes').insert({
          user_id: userId, phone: dados.celular.replace(/\D/g, ''), cpf: dados.cpf || null, preferencia_cafe: 'grao',
        }).select('id').single();
        if (cErr) throw new Error(`Erro ao criar perfil: ${cErr.message}`);
        theClienteId = c.id;
        setClienteId(c.id);
      }

      // Atualiza o lead com nome, telefone e cliente_id
      const leadIdAtual = await upsertLeadByEmail({
        email, etapa: 'checkout_iniciado',
        nome: dados.nome.trim(), telefone: dados.celular.replace(/\D/g, ''),
      }).catch(() => null);
      if (leadIdAtual && theClienteId) {
        void supabase.from('leads').update({ cliente_id: theClienteId }).eq('id', leadIdAtual);
        setLeadId(leadIdAtual);
      }

      setErrors({});
      setStep('preferencias');
    } catch (e: unknown) {
      err('geral', e instanceof Error ? e.message : 'Erro ao salvar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // PREFERENCIAS → ENDERECO
  const handlePreferencias = () => {
    setErrors({});
    // Inicializa seleção de endereço se ainda não definida
    if (enderecoSelecionadoId === null) {
      if (enderecosSalvos.length > 0) {
        const padrao = enderecosSalvos.find(e => e.padrao) ?? enderecosSalvos[0];
        selecionarEnderecoSalvo(padrao);
      } else {
        setEnderecoSelecionadoId('novo');
      }
    }
    setStep('endereco');
  };

  // ENDERECO: auto-fill via ViaCEP
  const handleCepChange = async (valor: string) => {
    setEndereco(e => ({ ...e, cep: valor }));
    const cepLimpo = valor.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setCepLoading(true);
    setFreteOpcoes([]); setFreteId(null);
    try {
      const addr = await buscarEnderecoCep(cepLimpo);
      setEndereco(e => ({ ...e, logradouro: addr.logradouro, bairro: addr.bairro, cidade: addr.cidade, estado: addr.estado }));
    } catch {
      err('cep', 'CEP não encontrado. Verifique e tente novamente.');
    } finally {
      setCepLoading(false);
    }
  };

  // ENDERECO: calcular frete manualmente (só necessário no formulário novo)
  const handleCalcularFrete = async () => {
    const cepLimpo = endereco.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) { err('cep', 'Informe um CEP válido para calcular o frete.'); return; }
    setErrors({});
    setFreteLoading(true);
    try {
      const opcoes = await calcularFrete(cepLimpo);
      setFreteOpcoes([RETIRADA_OPCAO, ...opcoes]);
      if (opcoes.length > 0) setFreteId(opcoes[0].id);
    } catch (e: unknown) {
      err('frete', e instanceof Error ? e.message : 'Erro ao calcular frete. Tente novamente.');
    } finally {
      setFreteLoading(false);
    }
  };

  // ENDERECO → PAGAMENTO
  const handleEndereco = () => {
    const errs: Record<string, string> = {};
    const retirada = freteId === 'retirada';
    // Endereço só é obrigatório quando não é retirada e não há endereço salvo selecionado
    if (!retirada && (!enderecoSelecionadoId || enderecoSelecionadoId === 'novo')) {
      if (!endereco.cep.trim())        errs.cep        = 'Informe seu CEP.';
      if (!endereco.logradouro.trim()) errs.logradouro  = 'Informe o logradouro.';
      if (!endereco.numero.trim())     errs.numero      = 'Informe o número.';
      if (!endereco.bairro.trim())     errs.bairro      = 'Informe o bairro.';
      if (!endereco.cidade.trim())     errs.cidade      = 'Informe a cidade.';
      if (!endereco.estado.trim())     errs.estado      = 'Selecione o estado.';
      if (freteOpcoes.length <= 1)     errs.frete       = 'Clique em "Calcular frete" antes de continuar.';
    }
    if (!freteId) errs.frete = 'Selecione uma opção de entrega para continuar.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep('pagamento');
  };

  // PAGAMENTO → STRIPE
  const handlePagar = async () => {
    if (!planoId || !freteSelecionado) { setAlerta('Dados incompletos. Volte e verifique as informações.'); return; }
    if (!userId || !clienteId)         { setAlerta('Sessão expirada. Recarregue a página e tente novamente.'); return; }

    setLoading(true);
    setAlerta('');
    try {
      const totalMensal = (planoObj?.preco ?? 0) + freteSelecionado.preco;
      let assId = assinaturaId;
      const lId = leadId ?? await salvarLead('pagamento_iniciado');

      if (!assId) {
        // 1. Resolver endereço (retirada = sem endereço de entrega)
        let enderecoId: string | null = null;
        if (freteId !== 'retirada') {
          if (enderecoSelecionadoId && enderecoSelecionadoId !== 'novo') {
            enderecoId = enderecoSelecionadoId;
          } else {
            const { data: endRow, error: eErr } = await supabase.from('enderecos').insert({
              cliente_id:  clienteId,
              cep:         endereco.cep.replace(/\D/g, ''),
              logradouro:  endereco.logradouro,
              numero:      endereco.numero,
              complemento: endereco.complemento || null,
              bairro:      endereco.bairro,
              cidade:      endereco.cidade,
              estado:      endereco.estado,
              padrao:      enderecosSalvos.length === 0,
            }).select('id').single();
            if (eErr) throw new Error(`Erro ao salvar endereço: ${eErr.message}`);
            enderecoId = endRow.id;
          }
        } else if (enderecoSelecionadoId && enderecoSelecionadoId !== 'novo') {
          // Retirada mas tem endereço salvo → vincular mesmo assim
          enderecoId = enderecoSelecionadoId;
        }

        // 2. Criar assinatura
        const proxStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          .toISOString().split('T')[0];
        const { data: assRow, error: aErr } = await supabase.from('assinaturas').insert({
          cliente_id:       clienteId,
          plano_id:         planoId,
          preferencia_cafe: preferencias.tipo,
          tipo_moagem:      preferencias.tipo === 'moido' ? preferencias.moagem : null,
          endereco_id:      enderecoId,
          frete:            freteSelecionado.preco,
          total_mensal:     totalMensal,
          proxima_cobranca: proxStr,
          proximo_envio:    proxStr,
          status:           'pendente',
          data_inicio:      new Date().toISOString().split('T')[0],
        }).select('id').single();
        if (aErr) throw new Error(`Erro ao criar assinatura: ${aErr.message}`);
        assId = assRow.id;
        setAssinaturaId(assId);
      }

      // 3. Atualizar lead
      if (lId) await updateLeadEtapa(lId as string, 'pagamento_iniciado').catch(() => {});

      // 4. Salvar para retorno do Stripe
      sessionStorage.setItem('dsmatas_lead_id',       lId ?? '');
      sessionStorage.setItem('dsmatas_assinatura_id', assId!);

      // 5. Criar sessão Stripe — mode: 'subscription' com price_data dinâmico
      // O total já inclui o frete específico de cada cliente, garantindo que
      // todas as renovações mensais cobrem o valor correto (plano + frete).
      const { url: stripeUrl, customerId: returnedCustomerId } = await createCheckoutSession({
        items: [{
          name:   `Assinatura ${planoObj?.nome ?? 'Das Matas'} — mensal`,
          amount: totalMensal,
        }],
        mode:          'subscription',
        successPath:   `/sucesso?tipo=assinatura&id=${assId}&lead=${lId ?? ''}`,
        cancelPath:    `/assinar?cancelado=true`,
        metadata:      { assinatura_id: assId!, cliente_id: clienteId! },
        customerId:    stripeCustomerId ?? undefined,
        customerEmail: email,
      });

      // 6. Salvar Stripe Customer ID no cliente (se for novo)
      if (returnedCustomerId && returnedCustomerId !== stripeCustomerId) {
        setStripeCustomerId(returnedCustomerId);
        updateClienteStripeCustomerId(clienteId!, returnedCustomerId).catch(() => {});
      }

      window.location.href = stripeUrl;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro inesperado. Tente novamente.';
      if (leadId) updateLeadEtapa(leadId, 'pagamento_invalido').catch(() => {});
      setAlerta(
        msg.includes('Failed to send') || msg.includes('Edge Function') || msg.includes('fetch')
          ? 'O sistema de pagamento está temporariamente indisponível. Verifique se a função create-checkout está deployada no Supabase e os secrets STRIPE_SECRET_KEY e SITE_URL estão configurados.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  const prevStep = () => {
    setErrors({}); setAlerta('');
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
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
          <p className="text-charcoal-500 text-sm mt-2">Café especial direto dos produtores até sua porta.</p>
        </div>

        <StepIndicator current={step} skipped={skipped} />

        <div className="bg-white rounded-sm border border-cream-200 p-8">

          {/* ── STEP 1: PLANO ──────────────────────────────────────────────── */}
          {step === 'plano' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Escolha seu plano</h2>
                <p className="text-sm text-charcoal-400">Todos incluem cafés especiais selecionados.</p>
              </div>
              {errors.plano && <Alert type="error" message={errors.plano} />}
              {planos.map(plano => (
                <label key={plano.id} className={`flex items-start gap-4 p-5 rounded-sm border-2 cursor-pointer transition-all ${
                  planoId === plano.id ? 'border-forest-500 bg-forest-50' : 'border-cream-300 hover:border-earth-300'
                }`}>
                  <input type="radio" name="plano" value={plano.id}
                    checked={planoId === plano.id}
                    onChange={() => setPlanoId(plano.id)}
                    className="mt-1 accent-forest-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif text-lg text-charcoal-700">{plano.nome}</span>
                      {plano.destaque && (
                        <span className="px-2 py-0.5 bg-forest-500 text-white text-xs rounded-full">Mais popular</span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-500 mb-2">{plano.descricao}</p>
                    <p className="font-display text-2xl text-charcoal-700">
                      R$ {plano.preco.toFixed(2).replace('.', ',')}
                      <span className="text-sm font-sans text-charcoal-400">/mês</span>
                    </p>
                  </div>
                </label>
              ))}
              <div className="pt-4">
                <Button variant="primary" size="lg" onClick={handleSelecionarPlano} className="w-full">
                  Assinar este plano <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: EMAIL ───────────────────────────────────────────────── */}
          {step === 'email' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">
                  {emailExists ? 'Bem-vindo de volta!' : 'Qual é o seu e-mail?'}
                </h2>
                <p className="text-sm text-charcoal-400">
                  {emailExists
                    ? 'Você já tem uma conta. Entre com sua senha para continuar.'
                    : 'Usaremos para enviar as informações da sua assinatura.'}
                </p>
              </div>
              <Input
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailExists(false); setSenha(''); setErrors({}); }}
                error={errors.email}
                placeholder="seu@email.com"
                disabled={emailChecking || loading}
              />
              {emailExists && (
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      label="Senha"
                      type={senhaVisivel ? 'text' : 'password'}
                      required
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      error={errors.senha}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setSenhaVisivel(v => !v)}
                      className="absolute right-3 top-9 text-charcoal-400 hover:text-charcoal-600">
                      {senhaVisivel ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Link to="/entrar" className="text-xs text-forest-600 hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
              )}
              <Alert type="info" message="Seus dados são protegidos e nunca compartilhados." />
            </div>
          )}

          {/* ── STEP 3: DADOS ───────────────────────────────────────────────── */}
          {step === 'dados' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Seus dados pessoais</h2>
                <p className="text-sm text-charcoal-400">Para enviarmos seu café e mantermos contato.</p>
              </div>
              {errors.geral && <Alert type="error" message={errors.geral} />}
              <Input label="Nome completo" required
                value={dados.nome}
                onChange={e => setDados(d => ({ ...d, nome: e.target.value }))}
                error={errors.nome} placeholder="Seu nome completo"
              />
              <Input label="Celular / WhatsApp" required
                value={dados.celular}
                onChange={e => setDados(d => ({ ...d, celular: e.target.value }))}
                error={errors.celular} placeholder="(11) 99999-9999"
              />
              <Input label="CPF (opcional)"
                value={dados.cpf}
                onChange={e => setDados(d => ({ ...d, cpf: e.target.value }))}
                placeholder="000.000.000-00"
                autoComplete="off"
              />
              {isNewUser && (
                <>
                  <div className="relative">
                    <Input label="Crie sua senha (mínimo 8 caracteres)"
                      type={senhaNovVisivel ? 'text' : 'password'}
                      required
                      value={dados.senhaNovo}
                      onChange={e => setDados(d => ({ ...d, senhaNovo: e.target.value }))}
                      error={errors.senhaNovo} placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setSenhaNovVisivel(v => !v)}
                      className="absolute right-3 top-9 text-charcoal-400 hover:text-charcoal-600">
                      {senhaNovVisivel ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Input label="Confirmar senha"
                    type="password" required
                    value={dados.confirmarSenha}
                    onChange={e => setDados(d => ({ ...d, confirmarSenha: e.target.value }))}
                    error={errors.confirmarSenha} placeholder="••••••••"
                  />
                </>
              )}
            </div>
          )}

          {/* ── STEP 4: PREFERÊNCIAS ────────────────────────────────────────── */}
          {step === 'preferencias' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Como você prefere o café?</h2>
                <p className="text-sm text-charcoal-400">Você pode alterar isso a qualquer momento na sua conta.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-3">Formato</p>
                <div className="grid grid-cols-2 gap-4">
                  {(['grao', 'moido'] as const).map(tipo => (
                    <button key={tipo} onClick={() => setPreferencias(p => ({ ...p, tipo }))}
                      className={`p-5 rounded-sm border-2 text-left transition-all ${
                        preferencias.tipo === tipo ? 'border-forest-500 bg-forest-50' : 'border-cream-300 hover:border-earth-300'
                      }`}
                    >
                      <Package size={24} className={`mb-2 ${preferencias.tipo === tipo ? 'text-forest-500' : 'text-charcoal-300'}`} />
                      <p className="font-medium text-charcoal-700">{tipo === 'grao' ? 'Em Grão' : 'Moído'}</p>
                      <p className="text-xs text-charcoal-400 mt-1">
                        {tipo === 'grao' ? 'Máximo frescor. Ideal para quem tem moedor.' : 'Prático e pronto para usar.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {preferencias.tipo === 'moido' && (
                <Select label="Tipo de moagem"
                  value={preferencias.moagem}
                  onChange={e => setPreferencias(p => ({ ...p, moagem: e.target.value }))}
                  options={[
                    { value: 'fino',        label: 'Fina — Espresso e Moka' },
                    { value: 'medio',       label: 'Média — Coador e AeroPress' },
                    { value: 'grosso',      label: 'Grossa — Prensa Francesa' },
                    { value: 'extraGrosso', label: 'Extra Grossa — Cold Brew' },
                  ]}
                />
              )}
            </div>
          )}

          {/* ── STEP 5: ENDEREÇO ────────────────────────────────────────────── */}
          {step === 'endereco' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Endereço de entrega</h2>
                <p className="text-sm text-charcoal-400">Onde entregaremos seu café todo mês.</p>
              </div>

              {/* Endereços salvos */}
              {enderecosSalvos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
                    Seus endereços cadastrados
                  </p>
                  {enderecosSalvos.map(end => (
                    <button key={end.id} type="button"
                      onClick={() => selecionarEnderecoSalvo(end)}
                      className={`w-full flex items-start gap-3 p-4 rounded-sm border-2 text-left transition-all ${
                        enderecoSelecionadoId === end.id
                          ? 'border-forest-500 bg-forest-50'
                          : 'border-cream-300 hover:border-earth-300'
                      }`}
                    >
                      <Home size={16} className={`mt-0.5 shrink-0 ${enderecoSelecionadoId === end.id ? 'text-forest-500' : 'text-charcoal-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-700">
                          {end.logradouro}, {end.numero}
                          {end.complemento ? ` — ${end.complemento}` : ''}
                        </p>
                        <p className="text-xs text-charcoal-400">
                          {end.bairro} · {end.cidade}/{end.estado} · CEP {end.cep}
                        </p>
                      </div>
                      {enderecoSelecionadoId === end.id && (
                        <Check size={16} className="text-forest-500 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}

                  {/* Opção: novo endereço */}
                  <button type="button"
                    onClick={() => {
                      setEnderecoSelecionadoId('novo');
                      setEndereco({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });
                      setFreteOpcoes([RETIRADA_OPCAO]); setFreteId('retirada');
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-sm border-2 text-left transition-all ${
                      enderecoSelecionadoId === 'novo'
                        ? 'border-forest-500 bg-forest-50'
                        : 'border-cream-300 hover:border-earth-300'
                    }`}
                  >
                    <Plus size={16} className={enderecoSelecionadoId === 'novo' ? 'text-forest-500' : 'text-charcoal-400'} />
                    <span className="text-sm font-medium text-charcoal-700">Usar um novo endereço</span>
                  </button>
                </div>
              )}

              {/* Formulário de novo endereço — oculto na retirada */}
              {freteId !== 'retirada' && (enderecoSelecionadoId === 'novo' || enderecosSalvos.length === 0) && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="relative">
                      <Input label="CEP" required
                        value={endereco.cep}
                        onChange={e => handleCepChange(e.target.value)}
                        error={errors.cep} placeholder="00000-000" maxLength={9}
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-9 w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div />
                  </div>
                  <Input label="Logradouro" required
                    value={endereco.logradouro}
                    onChange={e => setEndereco(a => ({ ...a, logradouro: e.target.value }))}
                    error={errors.logradouro} placeholder="Rua, Avenida..."
                  />
                  <div className="grid grid-cols-2 gap-5">
                    <Input label="Número" required
                      value={endereco.numero}
                      onChange={e => setEndereco(a => ({ ...a, numero: e.target.value }))}
                      error={errors.numero} placeholder="Ex: 100"
                    />
                    <Input label="Complemento"
                      value={endereco.complemento}
                      onChange={e => setEndereco(a => ({ ...a, complemento: e.target.value }))}
                      placeholder="Apto, bloco..."
                    />
                  </div>
                  <Input label="Bairro" required
                    value={endereco.bairro}
                    onChange={e => setEndereco(a => ({ ...a, bairro: e.target.value }))}
                    error={errors.bairro} placeholder="Bairro"
                  />
                  <div className="grid grid-cols-2 gap-5">
                    <Input label="Cidade" required
                      value={endereco.cidade}
                      onChange={e => setEndereco(a => ({ ...a, cidade: e.target.value }))}
                      error={errors.cidade} placeholder="Cidade"
                    />
                    <Select label="Estado"
                      value={endereco.estado}
                      onChange={e => setEndereco(a => ({ ...a, estado: e.target.value }))}
                      placeholder="UF"
                      options={['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
                        'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(s => ({ value: s, label: s }))}
                    />
                  </div>
                  {errors.estado && <p className="text-xs text-red-500 -mt-3">{errors.estado}</p>}
                  <Button variant="secondary" onClick={handleCalcularFrete} loading={freteLoading}>
                    <Truck size={16} /> Calcular opções de frete
                  </Button>
                </div>
              )}

              {errors.frete && <Alert type="error" message={errors.frete} />}

              {/* Opções de frete */}
              {freteLoading && (
                <div className="flex items-center gap-2 text-sm text-charcoal-400">
                  <div className="w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
                  Calculando opções de frete...
                </div>
              )}
              {freteOpcoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Opções de entrega</p>
                  {freteOpcoes.map(op => (
                    <label key={op.id} className={`flex items-center gap-4 p-4 rounded-sm border-2 cursor-pointer transition-all ${
                      freteId === op.id ? 'border-forest-500 bg-forest-50' : 'border-cream-300 hover:border-earth-300'
                    }`}>
                      <input type="radio" name="frete" value={op.id}
                        checked={freteId === op.id}
                        onChange={() => setFreteId(op.id)}
                        className="accent-forest-500"
                      />
                      {op.id === 'retirada'
                        ? <Store size={16} className="text-forest-500 shrink-0" />
                        : <MapPin size={16} className="text-charcoal-400 shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-charcoal-700">{op.nome}</p>
                        <p className="text-xs text-charcoal-400">
                          {op.id === 'retirada' ? op.empresa : `${op.empresa} · Prazo estimado: ${op.prazo} dias úteis`}
                        </p>
                      </div>
                      <span className={`text-sm font-medium ${op.id === 'retirada' ? 'text-forest-600' : 'text-charcoal-700'}`}>
                        {op.preco === 0 ? 'Grátis' : `R$ ${op.preco.toFixed(2).replace('.', ',')}`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: PAGAMENTO ───────────────────────────────────────────── */}
          {step === 'pagamento' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-700 mb-1">Resumo e pagamento</h2>
                <p className="text-sm text-charcoal-400">Revise os detalhes antes de pagar.</p>
              </div>

              <div className="bg-cream-100 rounded-sm p-5 border border-cream-200 space-y-2 text-sm">
                <p className="font-medium text-charcoal-600 mb-1">Resumo da assinatura</p>
                <div className="flex justify-between">
                  <span className="text-charcoal-500">{planoObj?.nome}</span>
                  <span className="text-charcoal-700">R$ {planoObj?.preco.toFixed(2).replace('.', ',')}</span>
                </div>
                {freteSelecionado && (
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">
                      {freteSelecionado.id === 'retirada' ? 'Retirada na cafeteria' : `Frete — ${freteSelecionado.empresa}`}
                    </span>
                    <span className={freteSelecionado.id === 'retirada' ? 'text-forest-600 font-medium' : 'text-charcoal-700'}>
                      {freteSelecionado.preco === 0 ? 'Grátis' : `R$ ${freteSelecionado.preco.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-cream-200">
                  <span className="font-medium text-charcoal-700">Total mensal</span>
                  <span className="font-serif text-xl text-charcoal-700">
                    R$ {((planoObj?.preco ?? 0) + (freteSelecionado?.preco ?? 0)).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="text-xs text-charcoal-400 pt-1">
                  {freteSelecionado?.id === 'retirada'
                    ? `Retirada em: ${RETIRADA_OPCAO.empresa}`
                    : `Entrega em ${freteSelecionado?.prazo ?? '—'} dias úteis · ${endereco.cidade}/${endereco.estado}`}
                </p>
              </div>

              {stripeCustomerId && (
                <Alert type="info" message="Seus cartões salvos aparecerão na próxima tela do Stripe para pagamento rápido." />
              )}

              {alerta && <Alert type="error" message={alerta} />}

              <Button variant="primary" size="lg" loading={loading} onClick={handlePagar} className="w-full">
                <CreditCard size={18} />
                {freteSelecionado?.id === 'retirada' ? 'Assinar e pagar' : 'Pagar'} R$ {((planoObj?.preco ?? 0) + (freteSelecionado?.preco ?? 0)).toFixed(2).replace('.', ',')} com Stripe
              </Button>

              <p className="text-xs text-charcoal-400 flex items-center justify-center gap-1.5">
                <Lock size={12} /> Pagamento 100% seguro via Stripe. Seus dados são criptografados.
              </p>
            </div>
          )}

          {/* ── NAVIGATION ──────────────────────────────────────────────────── */}
          {alerta && step !== 'pagamento' && <Alert type="error" message={alerta} />}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-cream-200">
            {step !== 'plano' ? (
              <button onClick={prevStep} className="text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors">
                ← Voltar
              </button>
            ) : <div />}

            {step === 'email' && (
              emailExists
                ? <Button variant="primary" loading={loading}  onClick={handleLogin}>Entrar e continuar <ChevronRight size={16} /></Button>
                : <Button variant="primary" loading={emailChecking} onClick={handleVerificarEmail}>Continuar <ChevronRight size={16} /></Button>
            )}
            {step === 'dados'        && <Button variant="primary" loading={loading} onClick={handleDados}>Continuar <ChevronRight size={16} /></Button>}
            {step === 'preferencias' && <Button variant="primary" onClick={handlePreferencias}>Continuar <ChevronRight size={16} /></Button>}
            {step === 'endereco'     && <Button variant="primary" onClick={handleEndereco}>Ir para pagamento <ChevronRight size={16} /></Button>}
            {(step === 'plano' || step === 'pagamento') && <div />}
          </div>
        </div>

        <p className="text-center text-xs text-charcoal-400 mt-6">
          Sem taxa de adesão · Cancele quando quiser · Dados protegidos pela LGPD
        </p>
      </div>
    </div>
  );
}
