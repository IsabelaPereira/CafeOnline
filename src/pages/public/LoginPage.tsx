import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === 'cliente' ? '/cliente' : '/admin');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (!ok) setError('E-mail ou senha incorretos.');
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@dasmatas.com.br', pass: 'Admin@123!' },
    { label: 'Cliente', email: 'marina.andrade@hotmail.com', pass: 'Cliente@123!' },
    { label: 'Financeiro', email: 'financeiro@dasmatas.com.br', pass: 'Fin@123!' },
  ];

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* ============================================================
          LEFT — atmospheric editorial brand panel (hidden on mobile)
         ============================================================ */}
      <aside className="hidden lg:flex relative w-[46%] xl:w-[52%] flex-col justify-between overflow-hidden bg-forest-700 text-cream-100 p-12 xl:p-16">
        {/* warm radial gradients (gold from top, earth from bottom) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(130% 90% at 10% -10%, rgba(184,148,31,0.22) 0%, transparent 55%), radial-gradient(90% 75% at 110% 110%, rgba(107,68,35,0.45) 0%, transparent 60%)',
          }}
        />
        {/* grain overlay */}
        <div aria-hidden className="absolute inset-0 grain-layer opacity-[0.2]" />

        {/* drifting decorative marks */}
        <div aria-hidden className="absolute inset-0 pointer-events-none select-none">
          <span
            className="absolute top-[14%] right-[10%] text-[160px] leading-none font-editorial italic text-cream-100/[0.04] drift-slow"
          >
            &
          </span>
          <span
            className="absolute bottom-[28%] left-[6%] text-[96px] leading-none font-display italic text-gold-300/[0.12] drift-slow"
            style={{ animationDelay: '-7s' }}
          >
            ✴
          </span>
          {/* coffee cherry SVG mark */}
          <svg
            className="absolute top-[38%] right-[8%] w-28 h-28 text-cream-100/[0.07] drift-slow"
            viewBox="0 0 100 100"
            fill="currentColor"
            style={{ animationDelay: '-3s' }}
          >
            <ellipse cx="50" cy="50" rx="24" ry="42" />
            <path d="M50 10 Q40 50 50 90" stroke="#2D4A3E" strokeOpacity="0.55" strokeWidth="2.5" fill="none" />
          </svg>
          {/* thin vertical rule */}
          <div className="absolute top-1/2 left-10 -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-gold-300/40 to-transparent" />
        </div>

        {/* TOP — back link + numbered marker */}
        <header className="relative z-10 flex items-start justify-between">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] uppercase text-cream-100/70 hover:text-cream-100 transition-colors"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
            Das Matas
          </Link>
          <div className="text-right font-mono text-[10px] tracking-[0.3em] uppercase">
            <div className="text-cream-100/70">Nº 01</div>
            <div className="text-cream-100/40 mt-1">Acesso · Membros</div>
          </div>
        </header>

        {/* CENTER — editorial quote */}
        <div className="relative z-10 max-w-xl">
          <div
            className="flex items-center gap-4 mb-10"
            style={{ animation: 'fadeIn 1s 0.1s both' }}
          >
            <span className="h-px w-10 bg-gold-400" />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold-300">
              Estação · Outono 26
            </span>
          </div>

          <h2
            className="font-editorial text-[68px] xl:text-[88px] leading-[0.95] tracking-tight text-cream-100"
            style={{ animation: 'slideUp 1s 0.2s both' }}
          >
            A lentidão
            <span className="block mt-1">
              <span className="font-display italic text-gold-300">tem</span>{' '}
              sabor.
            </span>
          </h2>

          <p
            className="mt-10 font-display italic text-xl xl:text-2xl text-cream-100/75 max-w-md leading-snug"
            style={{ animation: 'fadeIn 1.2s 0.5s both' }}
          >
            Micro-lotes colhidos a mão em fazendas regenerativas da Serra da
            Mantiqueira — torrados na semana, entregues em casa.
          </p>
        </div>

        {/* BOTTOM — coordinates & seal */}
        <footer className="relative z-10 flex items-end justify-between font-mono text-[11px] tracking-[0.25em] uppercase text-cream-100/55">
          <div>
            <div>Est. MMXX</div>
            <div className="mt-1 text-cream-100/35">Clube de café especial</div>
          </div>
          {/* circular wax-seal */}
          <div className="relative flex items-center justify-center">
            <svg className="w-20 h-20 text-gold-300/40" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.4" />
            </svg>
            <span className="absolute font-editorial italic text-gold-300/90 text-[22px] leading-none">
              dm
            </span>
          </div>
          <div className="text-right">
            <div>22°25′S · 45°27′W</div>
            <div className="mt-1 text-cream-100/35">Mantiqueira · MG</div>
          </div>
        </footer>
      </aside>

      {/* ============================================================
          RIGHT — refined form panel
         ============================================================ */}
      <main className="flex-1 flex items-center justify-center px-6 py-14 md:px-12 relative">
        {/* subtle texture + corner flourishes */}
        <div aria-hidden className="absolute inset-0 grain-layer opacity-[0.07]" />
        <div aria-hidden className="absolute top-0 right-0 w-48 h-48 pointer-events-none">
          <div className="absolute top-8 right-8 w-full h-px bg-earth-200/40" />
          <div className="absolute top-8 right-8 w-px h-full bg-earth-200/40" />
        </div>
        <div aria-hidden className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none">
          <div className="absolute bottom-8 left-8 w-full h-px bg-earth-200/40" />
          <div className="absolute bottom-8 left-8 w-px h-full bg-earth-200/40" />
        </div>

        {/* mobile brand bar */}
        <div className="absolute top-6 left-6 right-6 lg:hidden flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] uppercase text-charcoal-400 hover:text-charcoal-700 transition-colors"
          >
            ← Das Matas
          </Link>
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-300">
            Nº 01
          </span>
        </div>

        <div className="relative w-full max-w-md">
          {/* section marker */}
          <div
            className="flex items-center gap-3 mb-8"
            style={{ animation: 'fadeIn 0.9s 0.05s both' }}
          >
            <span className="h-px w-8 bg-earth-400" />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-earth-500">
              Identificação
            </span>
          </div>

          {/* editorial heading */}
          <h1
            className="font-editorial text-[52px] md:text-[64px] leading-[0.98] tracking-tight text-charcoal-700 mb-3"
            style={{ animation: 'slideUp 0.9s 0.12s both' }}
          >
            Bem-vindo
            <span className="block">
              <span className="font-display italic text-earth-500">de volta</span>.
            </span>
          </h1>
          <p
            className="font-display italic text-lg text-charcoal-400 mb-10"
            style={{ animation: 'slideUp 0.9s 0.22s both' }}
          >
            Sua xícara está esperando.
          </p>

          {/* error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50/70 border border-red-200 rounded-sm text-red-700 text-sm mb-6 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* form — underline-only inputs */}
          <form
            onSubmit={handleSubmit}
            className="space-y-7"
            style={{ animation: 'slideUp 0.9s 0.32s both' }}
          >
            <div>
              <label className="block font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-transparent border-0 border-b border-charcoal-200 px-0 py-2.5 text-base text-charcoal-700 placeholder:text-charcoal-300 focus:outline-none focus:border-forest-500 transition-colors duration-300"
              />
            </div>

            <div className="relative">
              <label className="block font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">
                Senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-0 border-b border-charcoal-200 px-0 py-2.5 pr-8 text-base text-charcoal-700 placeholder:text-charcoal-300 focus:outline-none focus:border-forest-500 transition-colors duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-2.5 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-500 cursor-pointer select-none">
                <input type="checkbox" className="w-3.5 h-3.5 accent-forest-500 rounded-sm" />
                Lembrar
              </label>
              <Link
                to="/recuperar-senha"
                className="font-mono text-[10px] tracking-[0.25em] uppercase text-earth-500 hover:text-earth-700 transition-colors"
              >
                Esqueci a senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-between gap-3 bg-forest-700 hover:bg-forest-600 text-cream-100 px-6 py-4 rounded-sm transition-all duration-300 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-3"
            >
              {/* sheen on hover */}
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.25) 50%, transparent 100%)',
                }}
              />
              <span className="relative font-mono text-[11px] tracking-[0.35em] uppercase">
                {loading ? 'Entrando' : 'Entrar no clube'}
              </span>
              <span className="relative flex items-center">
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
                    <path fill="currentColor" className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                )}
              </span>
            </button>
          </form>

          {/* divider */}
          <div
            className="flex items-center gap-4 mt-10 mb-6"
            style={{ animation: 'fadeIn 1s 0.45s both' }}
          >
            <hr className="flex-1 border-charcoal-200/60" />
            <span className="font-display italic text-sm text-charcoal-400">ou</span>
            <hr className="flex-1 border-charcoal-200/60" />
          </div>

          {/* sign up CTA */}
          <Link
            to="/assinar"
            className="group flex items-center justify-between border border-charcoal-200 hover:border-forest-700 hover:bg-forest-700 hover:text-cream-100 text-charcoal-600 px-6 py-4 rounded-sm transition-all duration-300"
            style={{ animation: 'fadeIn 1s 0.5s both' }}
          >
            <div>
              <div className="font-editorial text-lg leading-none">
                Ainda não é membro?
              </div>
              <div className="font-display italic text-sm opacity-70 mt-1">
                Torne-se sócio do clube
              </div>
            </div>
            <ArrowRight
              size={18}
              className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>

          {/* demo accounts */}
          <div className="mt-12" style={{ animation: 'fadeIn 1s 0.6s both' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-6 bg-charcoal-200" />
              <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-charcoal-400">
                Acesso demo
              </span>
              <span className="h-px flex-1 bg-charcoal-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                  }}
                  className="py-3 px-2 bg-cream-100/70 hover:bg-forest-500 hover:text-cream-100 text-charcoal-500 rounded-sm text-[10px] font-mono tracking-[0.25em] uppercase transition-all duration-200 active:scale-[0.97]"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* footer signature */}
          <div className="mt-12 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-300">
            <span>© Das Matas · MMXX</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gold-400" />
              Mantiqueira · MG
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
