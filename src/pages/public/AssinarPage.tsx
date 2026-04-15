import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Check, ChevronRight, Package, CreditCard, Lock,
  Truck, MapPin, Eye, EyeOff, Plus, Home, Store,
} from 'lucide-react';
import { Input, Select, Button, Alert } from '../../components/ui';
import { usePlanos } from '../../hooks/useAssinaturas';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createCheckoutSession } from '../../services/stripe.service';
import { upsertLeadByEmail, updateLeadCheckout } from '../../services/leads.service';
import { calcularFrete, buscarEnderecoCep, RETIRADA_OPCAO } from '../../services/frete.service';
import { getClienteByUserId, updateClienteStripeCustomerId } from '../../services/clientes.service';
import type { Endereco } from '../../types';
import type { FreteOpcao } from '../../services/frete.service';

// ─── Máscaras e validações ────────────────────────────────────────────────────
function formatCelular(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return d.length ? `(${d}` : '';
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3)  return d;
  if (d.length <= 6)  return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9)  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isCpfValid(v: string): boolean {
  const d = v.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (const ch of base) { sum += parseInt(ch, 10) * factor--; }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(d.slice(0, 9), 10) === parseInt(d[9], 10)
      && calc(d.slice(0, 10), 11) === parseInt(d[10], 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FlowStep = 'plano' | 'email' | 'dados' | 'preferencias' | 'endereco' | 'pagamento';

const STEPS: FlowStep[] = ['plano', 'email', 'dados', 'preferencias', 'endereco', 'pagamento'];
const STEP_LABELS: Record<FlowStep, string> = {
  plano: 'Plano', email: 'Contato', dados: 'Dados',
  preferencias: 'Preferências', endereco: 'Endereço', pagamento: 'Pagamento',
};

// ─── Top Progress ─────────────────────────────────────────────────────────────
function TopProgress({ current, skipped }: { current: FlowStep; skipped: Set<FlowStep> }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="sticky top-0 z-40 bg-cream-50/92 backdrop-blur-md border-b border-cream-300/70">
      <div className="px-4 md:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo-das-matas.png" alt="Das Matas" className="h-7 w-auto object-contain" />
          <span className="hidden sm:inline font-editorial text-lg text-charcoal-700 tracking-tight leading-none">
            Das Matas
          </span>
        </Link>

        {/* step strip */}
        <div className="flex-1 hidden md:flex items-center gap-2 max-w-2xl">
          {STEPS.map((s, i) => {
            const done = i < currentIdx || skipped.has(s);
            const active = i === currentIdx;
            return (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${
                      done
                        ? 'bg-forest-700 text-cream-100'
                        : active
                        ? 'bg-gold-400 text-forest-700 ring-4 ring-gold-400/20'
                        : 'bg-cream-200 text-charcoal-400'
                    }`}
                  >
                    {done ? (
                      <Check size={10} strokeWidth={3} />
                    ) : (
                      <span className="font-mono text-[9px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  {active && (
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-700 whitespace-nowrap">
                      {STEP_LABELS[s]}
                    </span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px transition-colors duration-500 ${
                      done ? 'bg-forest-500' : 'bg-cream-300'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* counter */}
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 shrink-0">
          {String(currentIdx + 1).padStart(2, '0')} <span className="text-charcoal-300">/ 06</span>
        </span>
      </div>
      {/* mobile progress */}
      <div className="md:hidden h-1 bg-cream-200">
        <div
          className="h-full bg-forest-500 transition-all duration-500"
          style={{ width: `${((currentIdx + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Form Heading (quieter — drama lives in the left visual) ────────────────
function StepHeading({ eyebrow, title, accent, subtitle }: {
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle: string;
}) {
  return (
    <div className="mb-7">
      <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-earth-500 mb-3">
        {eyebrow}
      </p>
      <h2 className="font-editorial text-[34px] md:text-[40px] leading-[1.05] tracking-tight text-charcoal-700">
        {title}
        {accent && (
          <>
            {' '}
            <span className="font-display italic text-earth-500">{accent}</span>
          </>
        )}
      </h2>
      <p className="font-sans text-base md:text-lg text-charcoal-500 mt-3 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

// ─── Step Visual (the "cena" — full-bleed cinematic panel per step) ─────────
type StepVisualProps = {
  step: FlowStep;
  planoObj: { nome: string; descricao: string; preco: number; destaque?: boolean } | undefined;
  planoIdx: number;
  dados: { nome: string };
  preferencias: { tipo: 'grao' | 'moido'; moagem: string };
  endereco: { cidade: string; estado: string };
  freteSelecionado: { id: string; preco: number; empresa: string; prazo?: number } | undefined;
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function StepVisual({ step, planoObj, planoIdx, dados, preferencias, endereco, freteSelecionado }: StepVisualProps) {
  const eyebrowMap: Record<FlowStep, string> = {
    plano: 'ETAPA · 01', email: 'ETAPA · 02', dados: 'ETAPA · 03',
    preferencias: 'ETAPA · 04', endereco: 'ETAPA · 05', pagamento: 'ETAPA · 06',
  };

  return (
    <aside className="relative overflow-hidden bg-forest-700 text-cream-100 min-h-[280px] md:min-h-[calc(100vh-64px)] md:sticky md:top-16">
      {/* atmospheric backgrounds */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(130% 90% at 0% 0%, rgba(201,168,76,0.18) 0%, transparent 55%), radial-gradient(90% 75% at 100% 100%, rgba(107,68,35,0.45) 0%, transparent 60%)',
        }}
      />
      <div aria-hidden className="absolute inset-0 grain-layer opacity-[0.18] pointer-events-none" />

      {/* content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10 lg:p-14 xl:p-20 min-h-inherit">
        {/* TOP */}
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold-400" />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300">
              {eyebrowMap[step]}
            </span>
          </div>
          <div className="hidden md:block text-right font-mono text-[9px] tracking-[0.3em] uppercase text-cream-100/45">
            <div>COMEÇE O DIA DE VERDADE</div>
            <div className="mt-0.5">COM CAFÉ DE VERDADE</div>
            <div className="mt-0.5">COMO VOCÊ MERECE</div>
          </div>
        </header>

        {/* CENTER — step-specific visual */}
        <div className="py-8 md:py-12 flex-1 flex flex-col justify-center">
          {/* —— PLANO —— */}
          {step === 'plano' && (
            <div className="relative" style={{ animation: 'fadeIn 0.8s both' }}>
              <div className="font-editorial text-[180px] md:text-[260px] leading-[0.8] text-cream-100/[0.07] select-none -ml-2 pointer-events-none">
                {ROMAN[planoIdx] ?? '—'}
              </div>
              <div className="-mt-20 md:-mt-28">
                <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">
                  Ritual escolhido
                </p>
                <h2 className="font-editorial text-[40px] md:text-[52px] leading-[0.98] text-cream-100 tracking-tight">
                  {planoObj?.nome ?? 'Selecione um plano'}
                </h2>
                <p className="font-display italic text-base md:text-lg text-cream-100/70 max-w-sm mt-3 leading-snug">
                  {planoObj?.descricao ?? 'Três curadorias distintas esperando você escolher.'}
                </p>
                <div className="flex items-baseline gap-2 mt-6">
                  <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-cream-100/50">
                    R$
                  </span>
                  <span className="font-editorial text-[44px] md:text-[52px] leading-none text-gold-300">
                    {planoObj?.preco.toFixed(2).replace('.', ',') ?? '—'}
                  </span>
                  <span className="font-display italic text-cream-100/50 ml-1">/mês</span>
                </div>
              </div>
            </div>
          )}

          {/* —— EMAIL —— */}
          {step === 'email' && (
            <div style={{ animation: 'fadeIn 0.8s both' }}>
              <div className="relative w-32 h-32 md:w-36 md:h-36 mb-8">
                <svg className="absolute inset-0 w-full h-full text-gold-300/50 drift-slow" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" />
                  <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.4" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-editorial italic text-gold-300 text-5xl md:text-6xl">
                  DM
                </span>
              </div>
              <h2 className="font-editorial text-[44px] md:text-[60px] leading-[0.95] text-cream-100 tracking-tight">
                Você merece
                <span className="block font-display italic text-gold-300">um café de verdade</span>
              </h2>
              <p className="font-display italic text-base md:text-lg text-cream-100/70 max-w-sm mt-5 leading-snug">
                Todos os meses enviaremos cafés de torra fresca, selecionados em curadoria para conhecer sensoriais e produtores diferentes todos os meses.
              </p>
            </div>
          )}

          {/* —— DADOS —— */}
          {step === 'dados' && (
            <div style={{ animation: 'fadeIn 0.8s both' }}>
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-6">
                Assinatura do sócio
              </p>
              <div className="min-h-[100px] md:min-h-[140px] flex items-end pb-4 border-b-2 border-gold-300/40 overflow-hidden">
                <p className="font-display italic text-[44px] md:text-[72px] leading-none text-cream-100 break-all">
                  {dados.nome?.trim() || 'seu nome aqui'}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="h-px w-6 bg-gold-300/50" />
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-cream-100/55">
                  Sócio · Clube Das Matas
                </span>
              </div>
            </div>
          )}

          {/* —— PREFERÊNCIAS —— */}
          {step === 'preferencias' && (
            <div style={{ animation: 'fadeIn 0.8s both' }}>
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-6">
                Você Escolhe
              </p>
              {preferencias.tipo === 'grao' ? (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-8 max-w-sm">
                    {[...Array(14)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-7 h-10 md:w-8 md:h-12 text-cream-100/80"
                        viewBox="0 0 30 45"
                        style={{ transform: `rotate(${(i * 37) % 80 - 40}deg)` }}
                      >
                        <ellipse cx="15" cy="22" rx="10" ry="20" fill="currentColor" opacity="0.85" />
                        <path d="M15 3 Q11 22 15 41" stroke="#111E18" strokeWidth="1.2" fill="none" opacity="0.6" />
                      </svg>
                    ))}
                  </div>
                  <h2 className="font-editorial text-[56px] md:text-[76px] leading-[0.95] text-cream-100 tracking-tight">
                    Experiência única
                  </h2>
                  <p className="font-display italic text-base md:text-lg text-cream-100/70 max-w-sm mt-3 leading-snug">
                    Torrado na semana de envio, aprecie a sua pausa com o máximo frescor a cada xícara.
                  </p>
                </>
              ) : (
                <>
                  <div
                    className="mb-8 max-w-xs h-28 rounded-sm overflow-hidden relative"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 20% 30%, rgba(248,244,239,0.65) 1px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(248,244,239,0.45) 1px, transparent 2px), radial-gradient(circle at 40% 80%, rgba(248,244,239,0.55) 1px, transparent 2px), radial-gradient(circle at 85% 20%, rgba(248,244,239,0.4) 1px, transparent 2px)',
                      backgroundSize: '18px 18px, 24px 24px, 14px 14px, 32px 32px',
                    }}
                  />
                  <h2 className="font-editorial text-[56px] md:text-[76px] leading-[0.95] text-cream-100 tracking-tight">
                    Como você decidir!
                  </h2>
                  <p className="font-display italic text-base md:text-lg text-cream-100/70 max-w-sm mt-3 leading-snug">
                    Café de verdade, pronto para o que você precisa!
                  </p>
                  <p className="font-display italic text-base md:text-lg text-cream-100/70 max-w-sm mt-3 leading-snug">
                    {preferencias.moagem} na medida certa.
                  </p>
                   
                </>
              )}
            </div>
          )}

          {/* —— ENDEREÇO —— */}
          {step === 'endereco' && (
            <div style={{ animation: 'fadeIn 0.8s both' }}>
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-5">
                EXCLUSIVO
              </p>
              <h2 className="font-editorial text-[40px] md:text-[56px] leading-[0.95] text-cream-100 tracking-tight">
                Clube Das Matas
                <span className="block font-display italic text-gold-300">
                  até {endereco.cidade?.trim() || 'sua casa'}.
                </span>
              </h2>
              <div className="mt-10 flex items-end gap-6">
                <svg className="w-20 h-20 md:w-24 md:h-24 text-gold-300/70 drift-slow" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 3" />
                  <path d="M50 10 L46 50 L50 90 L54 50 Z" fill="currentColor" opacity="0.65" />
                  <path d="M10 50 L50 46 L90 50 L50 54 Z" fill="currentColor" opacity="0.3" />
                  <circle cx="50" cy="50" r="2.5" fill="currentColor" />
                  <text x="50" y="20" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.9" fontFamily="ui-monospace">N</text>
                </svg>
                <div className="pb-2 font-mono text-[10px] tracking-[0.25em] uppercase text-cream-100/55 leading-relaxed">
                  <div>ENVIO PROGRAMADO</div>
                  <div>torra FRESCA</div>
                  <div>SEM RISCO DE ESQUECER</div>
                  <div>CAFÉS ÚNICOS</div>
                  <div>EXPERIÊNCIAS INESQUECÍVEIS</div>
                  <div>CAFÉS QUE NÃO ENCONTRA NO MERCADO</div>
                  <div>COMO VOCÊ MERECE</div>
                  <div>ÚNICO E INTELIGÊNTE</div>
                </div>
              </div>
            </div>
          )}

          {/* —— PAGAMENTO —— */}
          {step === 'pagamento' && (
            <div style={{ animation: 'fadeIn 0.8s both' }}>
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-4">
                Total mensal
              </p>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-mono text-sm text-cream-100/55">R$</span>
                <span className="font-editorial text-[clamp(2.25rem,8vw,70px)] leading-[0.95] md:leading-[0.85] text-cream-100 tracking-tight">Você está a um passo de transformar seu café do dia a dia.
                </span>
              </div>
              <div className="space-y-2 max-w-sm border-t border-dashed border-gold-300/30 pt-4">
                <div className="flex justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-cream-100/60">
                  <span>{planoObj?.nome ?? 'Plano'}</span>
                  <span>R$ {planoObj?.preco.toFixed(2).replace('.', ',') ?? '—'}</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-cream-100/60">
                  <span>
                    {freteSelecionado?.id === 'retirada' ? 'Retirada' : `Frete · ${freteSelecionado?.empresa ?? '—'}`}
                  </span>
                  <span>
                    {freteSelecionado?.preco === 0
                      ? 'Grátis'
                      : `R$ ${freteSelecionado?.preco.toFixed(2).replace('.', ',') ?? '—'}`}
                  </span>
                </div>
              </div>
              <p className="mt-8 font-display italic text-base md:text-lg text-cream-100/70 max-w-sm leading-snug">
                — Selecionado com carinho. Torrado na semana, entregue todo mês.
              </p>
              <p className="mt-8 font-display italic text-base md:text-lg text-cream-100/70 max-w-sm leading-snug">
                 “Uma experiência mensal com cafés premiados e perfis sensoriais únicos.”
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM */}
        <footer className="hidden md:flex items-end justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-cream-100/45">
          <span>DESDE 2019</span>
          <span>CLUBE DAS MATAS</span>
        </footer>
      </div>
    </aside>
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
  const [freteId,      setFreteId]      = useState<string | null>(null);
  const [freteLoading, setFreteLoading] = useState(false);

  // Evita duplicatas em retentativas de pagamento
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);

  const planoObj         = planos.find(p => p.id === planoId);
  const freteSelecionado = freteOpcoes.find(f => f.id === freteId);
  const enderecoSalvoSel = enderecosSalvos.find(e => e.id === enderecoSelecionadoId);

  // ── Auto-select first plan ─────────────────────────────────────────────────
  useEffect(() => {
    if (!planoId && planos.length > 0) setPlanoId(planos[0].id);
  }, [planos, planoId]);

  // ── Agenda check server-side de carrinho abandonado ao entrar em pagamento
  // O timer de 10 minutos começa quando o cliente chega à etapa, independente
  // de clicar ou não no botão para ir ao Stripe. O processamento é feito pela
  // Edge Function `process-abandonment-checks` via pg_cron (lado do servidor).
  const abandonmentScheduledRef = useRef(false);
  useEffect(() => {
    if (step !== 'pagamento') { abandonmentScheduledRef.current = false; return; }
    if (abandonmentScheduledRef.current) return;
    if (!leadId) {
      console.warn('[abandonment-check] leadId ausente ao entrar em pagamento — check não agendada');
      return;
    }
    abandonmentScheduledRef.current = true;
    const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    supabase.from('lead_abandonment_checks').insert({
      lead_id:       leadId,
      assinatura_id: assinaturaId,
      scheduled_at:  scheduledAt,
    }).then(r => {
      if (r.error) {
        console.warn('[abandonment-check] insert falhou:', r.error.message, r.error);
        abandonmentScheduledRef.current = false;
      } else {
        console.info('[abandonment-check] agendada para', scheduledAt, 'lead=', leadId, 'ass=', assinaturaId);
      }
    });
  }, [step, leadId, assinaturaId]);

  // ── Auto-avanço da etapa ENDEREÇO ao clicar em uma opção de frete ─────────
  const freteClickPendingRef = useRef(false);
  useEffect(() => {
    if (step !== 'endereco') { freteClickPendingRef.current = false; return; }
    if (!freteClickPendingRef.current) return;
    if (!freteId) return;
    freteClickPendingRef.current = false;
    handleEndereco();

  }, [step, freteId]);

  // ── Auto-avanço da etapa DADOS quando todos os campos estiverem válidos ──
  const dadosAutoAdvancedRef = useRef(false);
  useEffect(() => {
    if (step !== 'dados') { dadosAutoAdvancedRef.current = false; return; }
    if (loading) return;
    if (dadosAutoAdvancedRef.current) return;
    const cpfDigits = dados.cpf.replace(/\D/g, '');
    const celularDigits = dados.celular.replace(/\D/g, '');
    const nomeOk = dados.nome.trim().length > 0;
    const celularOk = celularDigits.length >= 10;
    const cpfOk = cpfDigits.length === 11 && isCpfValid(dados.cpf);
    const senhaOk = !isNewUser || (dados.senhaNovo.length >= 8 && dados.senhaNovo === dados.confirmarSenha);
    if (nomeOk && celularOk && cpfOk && senhaOk) {
      dadosAutoAdvancedRef.current = true;
      handleDados();
    }

  }, [step, dados, isNewUser, loading]);

  // ── Auto-focus CEP ao entrar na etapa de endereço (formulário novo) ───────
  useEffect(() => {
    if (step !== 'endereco') return;
    const usaFormNovo = enderecoSelecionadoId === 'novo' || enderecosSalvos.length === 0;
    if (!usaFormNovo) return;
    const t = setTimeout(() => document.getElementById('endereco-cep')?.focus(), 80);
    return () => clearTimeout(t);
  }, [step, enderecoSelecionadoId, enderecosSalvos.length]);

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
  // O controle de "carrinho abandonado" acontece server-side via pg_cron +
  // Edge Function `process-abandonment-checks` (agendada ao iniciar o pagamento).
  // Aqui só mostramos a mensagem e voltamos à etapa de pagamento.
  useEffect(() => {
    if (!cancelado) return;
    setAlerta('Seu pagamento não foi concluído. Você pode tentar novamente quando quiser.');
    setStep('pagamento');
    sessionStorage.removeItem('dsmatas_lead_id');
    sessionStorage.removeItem('dsmatas_assinatura_id');
  }, [cancelado]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function skipTo(target: FlowStep, toSkip: Set<FlowStep>) {
    setSkipped(toSkip);
    setStep(target);
  }

  async function salvarLead(
    etapa: Parameters<typeof upsertLeadByEmail>[0]['etapa'],
    extra?: { nome?: string; telefone?: string; tags?: string[]; observacoes?: string; proximoFollowUp?: string },
  ) {
    try {
      const id = await upsertLeadByEmail({
        email, etapa,
        nome:            extra?.nome,
        telefone:        extra?.telefone,
        tags:            extra?.tags,
        observacoes:     extra?.observacoes,
        proximoFollowUp: extra?.proximoFollowUp,
        origem:          'checkout',
        interesse:       'Clube de assinatura',
        planoDesejado:   planoId || undefined,
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
      // Lead será criado/atualizado em handleLogin (após autenticação)
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
    await salvarLead('checkout_plano', {
      tags:        ['clicou-na-assinatura', 'potencial-assinante'],
      observacoes: 'Iniciou checkout como novo usuário.',
    });
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
    await salvarLead('checkout_plano', {
      tags:        ['clicou-na-assinatura', 'potencial-assinante'],
      observacoes: 'Iniciou checkout com conta existente.',
    });

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
    if (!dados.cpf.trim())     errs.cpf     = 'Informe seu CPF.';
    else if (!isCpfValid(dados.cpf)) errs.cpf = 'CPF inválido. Verifique os dígitos.';

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
      const tagsDados = isNewUser
        ? ['inseriu-dados', 'potencial-assinante', 'criou-login']
        : ['inseriu-dados', 'potencial-assinante'];
      const leadIdAtual = await upsertLeadByEmail({
        email, etapa: 'checkout_contato',
        nome:        dados.nome.trim(),
        telefone:    dados.celular.replace(/\D/g, ''),
        tags:        tagsDados,
        observacoes: 'Preencheu dados de contato no checkout.',
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
  const handlePreferencias = async () => {
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
    if (leadId) {
      updateLeadCheckout(leadId, {
        etapa:       'checkout_preferencias',
        tags:        ['selecionou-preferencia', 'potencial-assinante'],
        observacoes: 'Selecionou preferências de café.',
      }).catch(() => {});
    }
    setStep('endereco');
  };

  // ENDERECO: auto-fill via ViaCEP + auto-calc frete + foco no número
  const handleCepChange = async (valor: string) => {
    setEndereco(e => ({ ...e, cep: valor }));
    const cepLimpo = valor.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setCepLoading(true);
    setFreteOpcoes([RETIRADA_OPCAO]); setFreteId(null);
    setErrors(prev => { const { cep, frete, ...rest } = prev; void cep; void frete; return rest; });
    try {
      const addr = await buscarEnderecoCep(cepLimpo);
      setEndereco(e => ({ ...e, logradouro: addr.logradouro, bairro: addr.bairro, cidade: addr.cidade, estado: addr.estado }));
      // foco automático no campo Número
      setTimeout(() => document.getElementById('endereco-numero')?.focus(), 60);
    } catch {
      err('cep', 'CEP não encontrado. Verifique e tente novamente.');
      setCepLoading(false);
      return;
    } finally {
      setCepLoading(false);
    }

    // cálculo automático de frete (sem auto-selecionar — usuário escolhe)
    setFreteLoading(true);
    try {
      const opcoes = await calcularFrete(cepLimpo);
      setFreteOpcoes([RETIRADA_OPCAO, ...opcoes]);
    } catch (e: unknown) {
      err('frete', e instanceof Error ? e.message : 'Erro ao calcular frete. Tente novamente.');
    } finally {
      setFreteLoading(false);
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
    // Endereço é obrigatório sempre — inclusive na retirada (cadastro do cliente)
    if (!enderecoSelecionadoId || enderecoSelecionadoId === 'novo') {
      if (!endereco.cep.trim())        errs.cep        = 'Informe seu CEP.';
      if (!endereco.logradouro.trim()) errs.logradouro  = 'Informe o logradouro.';
      if (!endereco.numero.trim())     errs.numero      = 'Informe o número.';
      if (!endereco.bairro.trim())     errs.bairro      = 'Informe o bairro.';
      if (!endereco.cidade.trim())     errs.cidade      = 'Informe a cidade.';
      if (!endereco.estado.trim())     errs.estado      = 'Selecione o estado.';
      if (!retirada && freteOpcoes.length <= 1) errs.frete = 'Clique em "Calcular frete" antes de continuar.';
    }
    if (!freteId) errs.frete = 'Selecione uma opção de entrega para continuar.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (leadId) {
      updateLeadCheckout(leadId, {
        etapa:       'checkout_endereco',
        tags:        ['informou-endereco', 'potencial-assinante'],
        observacoes: 'Informou endereço de entrega.',
      }).catch(() => {});
    }
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
      const lId = leadId ?? await salvarLead('checkout_pagamento', {
        tags:        ['iniciou-pagamento', 'potencial-assinante'],
        observacoes: 'Iniciou pagamento no Stripe.',
      });

      if (!assId) {
        // 1. Resolver endereço — sempre vinculado, mesmo na retirada (cadastro do cliente)
        let enderecoId: string | null = null;
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
      if (lId) {
        await updateLeadCheckout(lId as string, {
          etapa:       'checkout_pagamento',
          tags:        ['iniciou-pagamento', 'potencial-assinante'],
          observacoes: 'Iniciou pagamento no Stripe.',
        }).catch(() => {});
      }

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
      if (leadId) updateLeadCheckout(leadId, { etapa: 'pagamento_invalido' }).catch(() => {});
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
  const planoIdx = Math.max(0, planos.findIndex(p => p.id === planoId));

  return (
    <div className="min-h-screen bg-cream-100">
      <TopProgress current={step} skipped={skipped} />

      <div className="grid md:grid-cols-2 min-h-[calc(100vh-64px)]">
        {/* LEFT — cinematic per-step visual */}
        <StepVisual
          step={step}
          planoObj={planoObj}
          planoIdx={planoIdx}
          dados={dados}
          preferencias={preferencias}
          endereco={endereco}
          freteSelecionado={freteSelecionado}
        />

        {/* RIGHT — quiet form notebook */}
        <section className="relative flex items-start md:items-center justify-center px-5 py-10 md:px-12 lg:px-16 xl:px-24 md:py-14">
          <div aria-hidden className="absolute inset-0 grain-layer opacity-[0.05] pointer-events-none" />
          <div className="relative w-full max-w-md">

          {/* ── STEP 1: PLANO ──────────────────────────────────────────────── */}
          {step === 'plano' && (
            <div className="space-y-7">
              <StepHeading
                eyebrow="Nº 01 · Plano"
                title="Escolha seu"
                accent="ritual"
                subtitle="Três curadorias distintas. Todas com cafés especiais selecionados."
              />
              <div className="flex items-center gap-3 -mt-2 px-4 py-3 bg-cream-100 border border-cream-300 rounded-sm">
                <Package size={16} className="text-forest-500 shrink-0" />
                <p className="font-sans text-sm text-charcoal-700 leading-snug">
                  Todos os planos incluem <strong className="font-semibold">2 pacotes de 250g</strong> entregues todo mês.
                </p>
              </div>
              {errors.plano && <Alert type="error" message={errors.plano} />}
              <div className="space-y-3">
                {planos.map((plano, i) => {
                  const selected = planoId === plano.id;
                  const roman = ['I', 'II', 'III', 'IV', 'V'][i] ?? String(i + 1);
                  return (
                    <label
                      key={plano.id}
                      className={`group relative flex items-start gap-5 p-6 rounded-sm border cursor-pointer transition-all duration-300 overflow-hidden ${
                        selected
                          ? 'border-forest-500 bg-white shadow-[0_1px_0_rgba(45,74,62,0.08)]'
                          : 'border-cream-300 bg-white/60 hover:border-earth-400 hover:bg-white'
                      }`}
                    >
                      {/* gold accent bar on selected */}
                      <span
                        className={`absolute left-0 top-0 h-full w-[3px] transition-all ${
                          selected ? 'bg-gold-400' : 'bg-transparent'
                        }`}
                      />
                      <input
                        type="radio"
                        name="plano"
                        value={plano.id}
                        checked={selected}
                        onChange={() => {
                          setPlanoId(plano.id);
                          setErrors({});
                          setTimeout(() => setStep('email'), 150);
                        }}
                        className="sr-only"
                      />
                      {/* roman numeral */}
                      <div
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-editorial text-xl transition-all ${
                          selected
                            ? 'bg-forest-700 text-cream-100'
                            : 'bg-cream-100 text-charcoal-400 group-hover:bg-cream-200'
                        }`}
                      >
                        {roman}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-editorial text-[22px] text-charcoal-700 leading-none">
                            {plano.nome}
                          </span>
                          {plano.destaque && (
                            <span className="font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-0.5 bg-gold-400/90 text-forest-700 rounded-sm">
                              Preferido
                            </span>
                          )}
                        </div>
                        <p className="font-display italic text-[15px] text-charcoal-500 leading-snug mb-3">
                          {plano.descricao}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-400">
                            R$
                          </span>
                          <span className="font-editorial text-[32px] text-charcoal-700 leading-none">
                            {plano.preco.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="font-display italic text-sm text-charcoal-400 ml-1">
                            /mês
                          </span>
                        </div>
                      </div>
                      {/* selected indicator */}
                      <div
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          selected ? 'border-forest-500 bg-forest-500' : 'border-cream-300 bg-transparent'
                        }`}
                      >
                        {selected && <Check size={12} className="text-cream-100" strokeWidth={3} />}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSelecionarPlano}
                  className="group relative w-full flex items-center justify-between gap-3 bg-forest-700 hover:bg-forest-600 text-cream-100 px-6 py-4 rounded-sm transition-all duration-300 active:scale-[0.99]"
                >
                  <span className="font-mono text-[11px] tracking-[0.35em] uppercase">
                    Assinar este plano
                  </span>
                  <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: EMAIL ───────────────────────────────────────────────── */}
          {step === 'email' && (
            <div className="space-y-6">
              <StepHeading
                eyebrow="Nº 02 · Contato"
                title={emailExists ? 'Bem-vindo' : 'Qual é o seu'}
                accent={emailExists ? 'de volta' : 'e-mail?'}
                subtitle={
                  emailExists
                    ? 'Você já tem uma conta. Entre com sua senha para continuar.'
                    : 'Usaremos para enviar as informações da sua assinatura.'
                }
              />
              <Input
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailExists(false); setSenha(''); setErrors({}); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !emailExists && !emailChecking && !loading) {
                    e.preventDefault();
                    handleVerificarEmail();
                  }
                }}
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
            <div className="space-y-6">
              <StepHeading
                eyebrow="Nº 03 · Dados"
                title="Seus"
                accent="dados"
                subtitle="Para enviarmos seu café e mantermos contato."
              />
              {errors.geral && <Alert type="error" message={errors.geral} />}
              <Input label="Nome completo" required
                value={dados.nome}
                onChange={e => setDados(d => ({ ...d, nome: e.target.value }))}
                error={errors.nome} placeholder="Seu nome completo"
              />
              <Input label="Celular / WhatsApp" required
                value={dados.celular}
                onChange={e => setDados(d => ({ ...d, celular: formatCelular(e.target.value) }))}
                error={errors.celular} placeholder="(11) 99999-9999"
                inputMode="numeric" autoComplete="tel-national" maxLength={16}
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
              <Input label="CPF" required
                value={dados.cpf}
                onChange={e => setDados(d => ({ ...d, cpf: formatCpf(e.target.value) }))}
                error={errors.cpf}
                placeholder="000.000.000-00"
                inputMode="numeric" autoComplete="off" maxLength={14}
              />
            </div>
          )}

          {/* ── STEP 4: PREFERÊNCIAS ────────────────────────────────────────── */}
          {step === 'preferencias' && (
            <div className="space-y-7">
              <StepHeading
                eyebrow="Nº 04 · Preferências"
                title="Como você"
                accent="prefere?"
                subtitle="Você pode alterar isso a qualquer momento na sua conta."
              />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-px w-6 bg-cream-300" />
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400">Formato</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['grao', 'moido'] as const).map(tipo => {
                    const selected = preferencias.tipo === tipo;
                    return (
                      <button
                        key={tipo}
                        onClick={() => {
                          if (tipo === 'grao') {
                            setPreferencias({ tipo: 'grao', moagem: 'medio' });
                            setTimeout(() => handlePreferencias(), 120);
                          } else {
                            // Moído: limpa a moagem para forçar escolha consciente antes de avançar
                            setPreferencias({ tipo: 'moido', moagem: '' });
                          }
                        }}
                        className={`relative p-6 rounded-sm border text-left transition-all duration-300 overflow-hidden ${
                          selected
                            ? 'border-forest-500 bg-white shadow-[0_1px_0_rgba(45,74,62,0.08)]'
                            : 'border-cream-300 bg-white/60 hover:border-earth-400 hover:bg-white'
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-0 h-full w-[3px] transition-all ${
                            selected ? 'bg-gold-400' : 'bg-transparent'
                          }`}
                        />
                        <Package
                          size={22}
                          className={`mb-4 transition-colors ${selected ? 'text-forest-500' : 'text-charcoal-300'}`}
                        />
                        <p className="font-editorial text-[22px] text-charcoal-700 leading-none">
                          {tipo === 'grao' ? 'Em grão' : 'Moído'}
                        </p>
                        <p className="font-display italic text-sm text-charcoal-400 mt-2 leading-snug">
                          {tipo === 'grao' ? 'Máximo frescor — ideal para quem tem moedor.' : 'Prático e pronto para usar.'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {preferencias.tipo === 'moido' && (
                <Select label="Tipo de moagem"
                  value={preferencias.moagem}
                  placeholder="Escolha a granulometria"
                  onChange={e => {
                    const moagem = e.target.value;
                    setPreferencias(p => ({ ...p, moagem }));
                    if (moagem) setTimeout(() => handlePreferencias(), 120);
                  }}
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
            <div className="space-y-6">
              <StepHeading
                eyebrow="Nº 05 · Entrega"
                title="Onde"
                accent="entregar?"
                subtitle="O endereço onde chega o seu café todo mês."
              />

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

              {/* Formulário de novo endereço */}
              {(enderecoSelecionadoId === 'novo' || enderecosSalvos.length === 0) && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="relative">
                      <Input id="endereco-cep" label="CEP" required
                        value={endereco.cep}
                        onChange={e => handleCepChange(e.target.value)}
                        error={errors.cep} placeholder="00000-000" maxLength={9}
                        inputMode="numeric" autoComplete="postal-code"
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
                    <Input id="endereco-numero" label="Número" required
                      value={endereco.numero}
                      onChange={e => setEndereco(a => ({ ...a, numero: e.target.value }))}
                      error={errors.numero} placeholder="Ex: 100"
                      inputMode="numeric"
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
                  {errors.frete && (
                    <Button variant="secondary" onClick={handleCalcularFrete} loading={freteLoading}>
                      <Truck size={16} /> Recalcular opções de frete
                    </Button>
                  )}
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
                        onChange={() => {
                          freteClickPendingRef.current = true;
                          setFreteId(op.id);
                        }}
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
            <div className="space-y-7">
              <StepHeading
                eyebrow="Nº 06 · Pagamento"
                title="Resumo"
                accent="& pagamento"
                subtitle="Revise os detalhes antes de pagar."
              />

              {/* Receipt */}
              <div className="relative bg-white border border-charcoal-200/60 rounded-sm p-7 overflow-hidden">
                <div
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background:
                      'repeating-linear-gradient(90deg, #C9A84C 0 8px, transparent 8px 14px)',
                  }}
                />
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-5 bg-earth-400" />
                    <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-earth-500">
                      Resumo · Assinatura
                    </span>
                  </div>
                  <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-charcoal-400">
                    Mensal
                  </span>
                </div>

                <div className="space-y-3 pb-4 border-b border-dashed border-cream-300">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-editorial text-xl text-charcoal-700 leading-tight">
                        {planoObj?.nome}
                      </p>
                      <p className="font-sans text-sm text-charcoal-600 mt-1 leading-snug">
                        2 pacotes de 250g · envio mensal
                      </p>
                      <p className="font-sans text-sm text-charcoal-700 mt-2 leading-snug flex items-center gap-2">
                        <Package size={14} className="text-forest-500 shrink-0" />
                        <span>
                          {preferencias.tipo === 'grao'
                            ? 'Em grão'
                            : `Moído · ${
                                ({ fino: 'Fina', medio: 'Média', grosso: 'Grossa', extraGrosso: 'Extra grossa' } as const)[
                                  preferencias.moagem as 'fino' | 'medio' | 'grosso' | 'extraGrosso'
                                ] ?? preferencias.moagem
                              }`}
                        </span>
                      </p>
                    </div>
                    <span className="font-editorial text-[22px] text-charcoal-700 shrink-0">
                      R$ {planoObj?.preco.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {freteSelecionado && (
                    <div className="flex items-baseline justify-between gap-4 pt-1">
                      <div className="flex items-center gap-2">
                        {freteSelecionado.id === 'retirada'
                          ? <Store size={16} className="text-forest-500" />
                          : <Truck size={16} className="text-charcoal-400" />}
                        <span className="font-sans text-base text-charcoal-700">
                          {freteSelecionado.id === 'retirada' ? 'Retirada na cafeteria' : `Frete · ${freteSelecionado.empresa}`}
                        </span>
                      </div>
                      <span
                        className={`font-editorial text-lg shrink-0 ${
                          freteSelecionado.id === 'retirada' ? 'text-forest-600' : 'text-charcoal-700'
                        }`}
                      >
                        {freteSelecionado.preco === 0 ? 'Grátis' : `R$ ${freteSelecionado.preco.toFixed(2).replace('.', ',')}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Endereço completo */}
                {(() => {
                  const end = enderecoSalvoSel ?? endereco;
                  const temEndereco = !!(end.logradouro || end.cep);
                  if (!temEndereco) return null;
                  const linha1 = [end.logradouro, end.numero].filter(Boolean).join(', ');
                  const linha1Complemento = end.complemento ? `${linha1} — ${end.complemento}` : linha1;
                  const linha2 = [end.bairro, end.cidade && end.estado ? `${end.cidade}/${end.estado}` : end.cidade]
                    .filter(Boolean).join(' · ');
                  const cepFmt = end.cep?.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
                  return (
                    <div className="pt-4 pb-4 border-b border-dashed border-cream-300">
                      <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-charcoal-400 mb-2">
                        {freteSelecionado?.id === 'retirada' ? 'Endereço do cliente' : 'Endereço de entrega'}
                      </p>
                      <p className="font-sans text-sm text-charcoal-700 leading-snug">{linha1Complemento}</p>
                      {linha2 && (
                        <p className="font-sans text-sm text-charcoal-600 leading-snug">{linha2}</p>
                      )}
                      {cepFmt && (
                        <p className="font-sans text-xs text-charcoal-400 mt-1">CEP {cepFmt}</p>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-baseline justify-between pt-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-charcoal-400">
                      Total mensal
                    </p>
                    <p className="font-sans text-sm text-charcoal-600 mt-1 leading-snug">
                      {freteSelecionado?.id === 'retirada'
                        ? `Retirada em ${RETIRADA_OPCAO.empresa}`
                        : `Entrega em ${freteSelecionado?.prazo ?? '—'} dias úteis`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-400">R$</span>
                    <span className="font-editorial text-[40px] text-charcoal-700 leading-none ml-1">
                      {((planoObj?.preco ?? 0) + (freteSelecionado?.preco ?? 0)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {stripeCustomerId && (
                <Alert type="info" message="Seus cartões salvos aparecerão na próxima tela do Stripe para pagamento rápido." />
              )}

              {alerta && <Alert type="error" message={alerta} />}

              <button
                onClick={handlePagar}
                disabled={loading}
                className="group relative w-full flex items-center justify-between gap-3 bg-forest-700 hover:bg-forest-600 text-cream-100 px-6 py-5 rounded-sm transition-all duration-300 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.25) 50%, transparent 100%)',
                  }}
                />
                <span className="relative flex items-center gap-3">
                  <CreditCard size={18} />
                  <span className="font-mono text-[11px] tracking-[0.35em] uppercase">
                    {freteSelecionado?.id === 'retirada' ? 'Assinar & pagar' : 'Pagar com Stripe'}
                  </span>
                </span>
                <span className="relative font-editorial text-lg">
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
                      <path fill="currentColor" className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>R$ {((planoObj?.preco ?? 0) + (freteSelecionado?.preco ?? 0)).toFixed(2).replace('.', ',')}</>
                  )}
                </span>
              </button>

              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-400 flex items-center justify-center gap-2">
                <Lock size={11} /> Pagamento seguro · Stripe · SSL
              </p>
            </div>
          )}

          {/* ── NAVIGATION ──────────────────────────────────────────────────── */}
          {alerta && step !== 'pagamento' && <Alert type="error" message={alerta} />}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-cream-200">
            {step !== 'plano' ? (
              <button
                onClick={prevStep}
                className="group inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-500 hover:text-forest-600 transition-colors"
              >
                <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
                Voltar
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

          {/* guarantees */}
          <div className="mt-10 pt-6 border-t border-cream-300/70 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] tracking-[0.25em] uppercase text-charcoal-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-forest-500" />
              Sem taxa de adesão
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gold-400" />
              Cancele quando quiser
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={10} />
              LGPD · Seguro
            </span>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
