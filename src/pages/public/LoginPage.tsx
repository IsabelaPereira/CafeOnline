import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, AlertCircle } from 'lucide-react';
import { Input, Button, Divider } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'cliente' ? '/cliente' : '/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (!ok) {
      setError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-forest-500 rounded-sm flex items-center justify-center">
              <Coffee size={22} className="text-cream-100" />
            </div>
            <span className="font-serif text-2xl text-charcoal-700">Das Matas</span>
          </Link>
          <h1 className="font-serif text-3xl text-charcoal-700 mb-2">Bem-vindo de volta</h1>
          <p className="text-charcoal-400 text-sm">Entre com sua conta para acessar o clube.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-sm border border-cream-200 shadow-sm p-8">
          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-sm text-red-600 text-sm mb-6">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="E-mail"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            <Input
              label="Senha"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-charcoal-500 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-forest-500" />
                Lembrar de mim
              </label>
              <Link to="/recuperar-senha" className="text-sm text-forest-500 hover:text-forest-600">
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>

          <Divider label="ou" />

          <p className="text-center text-sm text-charcoal-500">
            Ainda não é membro?{' '}
            <Link to="/assinar" className="text-forest-500 font-medium hover:text-forest-600">
              Assinar o clube
            </Link>
          </p>
        </div>

        {/* Quick access */}
        <div className="mt-6 bg-white rounded-sm border border-cream-200 p-4">
          <p className="text-xs text-charcoal-400 text-center mb-3">Acesso rápido para demonstração</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Admin', email: 'admin@dasmatas.com.br', pass: 'Admin@123!' },
              { label: 'Cliente', email: 'marina.andrade@hotmail.com', pass: 'Cliente@123!' },
              { label: 'Financeiro', email: 'financeiro@dasmatas.com.br', pass: 'Fin@123!' },
            ].map(acc => (
              <button
                key={acc.label}
                onClick={() => { setEmail(acc.email); setPassword(acc.pass); }}
                className="py-2 px-3 border border-cream-300 rounded-sm text-xs text-charcoal-500 hover:bg-cream-50 transition-colors"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-xs text-charcoal-400 hover:text-charcoal-600">
            ← Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
