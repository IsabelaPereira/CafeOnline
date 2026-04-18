import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createLead } from './services/leads.service';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { getFirstAllowedRoute } from './lib/permissions';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { ClientLayout } from './components/layout/ClientLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { PlanosPage } from './pages/public/PlanosPage';
import { SobrePage } from './pages/public/SobrePage';
import { BlogPage, BlogPostPage } from './pages/public/BlogPage';
import { LojaPage } from './pages/public/LojaPage';
import { ReservasPage } from './pages/public/ReservasPage';
import { AssinarPage } from './pages/public/AssinarPage';
import { LoginPage } from './pages/public/LoginPage';
import { CheckoutPage } from './pages/public/CheckoutPage';
import { SuccessPage } from './pages/public/SuccessPage';
import { CafeteriaPage } from './pages/public/CafeteriaPage';

// Client Pages
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientAssinaturas } from './pages/client/ClientAssinaturas';
import { ClientPedidos } from './pages/client/ClientPedidos';
import { ClientConteudo } from './pages/client/ClientConteudo';
import { ClientAvaliacoes } from './pages/client/ClientAvaliacoes';
import { ClientPerfil } from './pages/client/ClientPerfil';
import { ClientRastreamentos } from './pages/client/ClientRastreamentos';
import { ClientEnderecos } from './pages/client/ClientEnderecos';
import { ClientPagamentos } from './pages/client/ClientPagamentos';
import { ClientReservas } from './pages/client/ClientReservas';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPedidos } from './pages/admin/AdminPedidos';
import { AdminAssinaturas } from './pages/admin/AdminAssinaturas';
import { AdminCRM } from './pages/admin/AdminCRM';
import { AdminReservas } from './pages/admin/AdminReservas';
import { AdminProdutos } from './pages/admin/AdminProdutos';
import { AdminBlog } from './pages/admin/AdminBlog';
import { AdminFinanceiro } from './pages/admin/AdminFinanceiro';
import { AdminRelatorios } from './pages/admin/AdminRelatorios';
import { AdminConfiguracoes } from './pages/admin/AdminConfiguracoes';
import { AdminLogistica } from './pages/admin/AdminLogistica';
import { AdminEdicoes } from './pages/admin/AdminEdicoes';
import { AdminLogs } from './pages/admin/AdminLogs';
import { AdminCategorias } from './pages/admin/AdminCategorias';
import { AdminUsuarios } from './pages/admin/AdminUsuarios';

// ---- Protected Routes ----
function ProtectedClientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isClient, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated || !isClient) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedAdminRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { isAuthenticated, isAdmin, hasPermission, permissions, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to={getFirstAllowedRoute(permissions)} replace />;
  return <>{children}</>;
}

// ---- CLUBE PAGE (simple redirect to planos) ----
function ClubePage() {
  return <Navigate to="/planos" replace />;
}

// ---- CONTATO PAGE ----
function ContatoPage() {
  const [form, setForm] = useState({ nome: '', email: '', mensagem: '' });
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.mensagem) return;
    setLoading(true);
    setErro('');
    try {
      await createLead({
        nome: form.nome,
        email: form.email,
        origem: 'landing',
        interesse: `Contato: ${form.mensagem.slice(0, 120)}`,
      });
      setEnviado(true);
    } catch {
      setErro('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-cream-100">
      <section className="py-20 bg-charcoal-700 text-center">
        <h1 className="font-serif text-5xl text-cream-100 mb-3">Entre em contato</h1>
        <p className="text-charcoal-300 max-w-lg mx-auto">
          Dúvidas, sugestões ou apenas quer falar sobre café? Estamos aqui.
        </p>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-sm border border-cream-200 p-6 space-y-4">
            <h3 className="font-serif text-lg text-charcoal-700">Fale conosco</h3>
            <div>
              <p className="text-sm font-medium text-charcoal-700">E-mail</p>
              <a href="mailto:contato@dasmatas.com.br" className="text-sm text-forest-500 hover:underline">
                contato@dasmatas.com.br
              </a>
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal-700">WhatsApp</p>
              <a href="https://wa.me/5511999998888" className="text-sm text-forest-500 hover:underline">
                (11) 99999-8888
              </a>
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal-700">Endereço</p>
              <p className="text-sm text-charcoal-500">Rua dos Cafezais, 245</p>
              <p className="text-sm text-charcoal-500">São Paulo – SP</p>
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal-700">Horário</p>
              <p className="text-sm text-charcoal-500">Seg – Sex: 9h às 18h</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          {enviado ? (
            <div className="bg-white rounded-sm border border-cream-200 p-10 text-center">
              <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl text-charcoal-700 mb-2">Mensagem enviada!</h2>
              <p className="text-charcoal-500 text-sm">
                Recebemos sua mensagem e responderemos em até 1 dia útil para <strong>{form.email}</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-sm border border-cream-200 p-8">
              <h2 className="font-serif text-2xl text-charcoal-700 mb-6">Envie sua mensagem</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Nome *</label>
                    <input
                      required
                      value={form.nome}
                      onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Seu nome completo"
                      className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">E-mail *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Mensagem *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.mensagem}
                    onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))}
                    placeholder="Como podemos ajudar?"
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400 resize-none"
                  />
                </div>
                {erro && <p className="text-sm text-red-500">{erro}</p>}
                <button
                  type="submit"
                  disabled={loading || !form.nome || !form.email || !form.mensagem}
                  className="w-full py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enviando...' : 'Enviar mensagem'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- PRIVACIDADE PAGE ----
function PrivacidadePage() {
  return (
    <div className="pt-20 min-h-screen bg-cream-100">
      <section className="py-14 bg-charcoal-700 text-center">
        <h1 className="font-serif text-4xl text-cream-100 mb-2">Política de Privacidade</h1>
        <p className="text-charcoal-400 text-sm">Última atualização: abril de 2026</p>
      </section>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8 text-sm text-charcoal-600 leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">1. Quem somos</h2>
          <p>Das Matas Café Especial LTDA, inscrita no CNPJ 00.000.000/0001-00, com sede em Rua dos Cafezais, 245, São Paulo – SP. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">2. Dados coletados</h2>
          <p>Coletamos: nome, e-mail, telefone, CPF e endereço fornecidos no cadastro; dados de pagamento processados de forma segura por parceiros certificados (Pagar.me / Stripe); dados de navegação (cookies) para melhoria da experiência.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">3. Finalidade do uso</h2>
          <p>Seus dados são usados para: processamento de pedidos e assinaturas; comunicação sobre sua conta; envio de newsletter (com consentimento); cumprimento de obrigações legais e fiscais.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">4. Compartilhamento</h2>
          <p>Não vendemos dados pessoais. Podemos compartilhá-los com prestadores de serviço essenciais (transportadoras, gateway de pagamento, plataforma de e-mail), sempre sob acordo de confidencialidade.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">5. Seus direitos (LGPD)</h2>
          <p>Conforme a Lei 13.709/2018 (LGPD), você tem direito a: acessar, corrigir ou excluir seus dados; revogar consentimento; solicitar portabilidade. Entre em contato: <a href="mailto:privacidade@dasmatas.com.br" className="text-forest-500 hover:underline">privacidade@dasmatas.com.br</a>.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">6. Cookies</h2>
          <p>Utilizamos cookies técnicos (necessários ao funcionamento) e de análise (com seu consentimento). Você pode gerenciá-los nas configurações do seu navegador.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">7. Segurança</h2>
          <p>Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, incluindo criptografia em trânsito (TLS) e armazenamento em provedores de nuvem certificados.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">8. Contato</h2>
          <p>Dúvidas sobre privacidade: <a href="mailto:privacidade@dasmatas.com.br" className="text-forest-500 hover:underline">privacidade@dasmatas.com.br</a>.</p>
        </section>
      </div>
    </div>
  );
}

// ---- TERMOS PAGE ----
function TermosPage() {
  return (
    <div className="pt-20 min-h-screen bg-cream-100">
      <section className="py-14 bg-charcoal-700 text-center">
        <h1 className="font-serif text-4xl text-cream-100 mb-2">Termos de Uso</h1>
        <p className="text-charcoal-400 text-sm">Última atualização: abril de 2026</p>
      </section>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8 text-sm text-charcoal-600 leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">1. Aceitação</h2>
          <p>Ao acessar ou utilizar o site e os serviços da Das Matas, você concorda com estes Termos de Uso. Se não concordar, não utilize nossos serviços.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">2. Serviços</h2>
          <p>A Das Matas oferece: clube de assinatura mensal de cafés especiais; loja virtual de produtos avulsos; reservas de mesa na cafeteria; conteúdo educativo sobre café.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">3. Assinatura</h2>
          <p>A assinatura é mensal e renovada automaticamente. Você pode cancelar a qualquer momento pela sua área de cliente, sem multas. O cancelamento é efetivo no próximo ciclo de cobrança. Não há reembolso de parcelas já cobradas, salvo em casos previstos pelo Código de Defesa do Consumidor.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">4. Pagamentos</h2>
          <p>Os pagamentos são processados por parceiros certificados (PCI-DSS). A Das Matas não armazena dados de cartão de crédito. Em caso de falha de cobrança, tentaremos novamente em até 3 dias antes de suspender a assinatura.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">5. Entregas</h2>
          <p>Os prazos de entrega são estimados e podem variar por fatores externos (clima, greves, etc.). A Das Matas não se responsabiliza por atrasos causados pelas transportadoras, mas tomará todas as medidas para minimizá-los.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">6. Trocas e devoluções</h2>
          <p>Produtos com defeito ou divergentes do pedido podem ser trocados em até 7 dias após o recebimento. Entre em contato com nosso suporte: <a href="mailto:contato@dasmatas.com.br" className="text-forest-500 hover:underline">contato@dasmatas.com.br</a>.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">7. Propriedade intelectual</h2>
          <p>Todo o conteúdo do site (textos, imagens, logotipos) é de propriedade da Das Matas ou de seus licenciantes. É proibida a reprodução sem autorização prévia.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-charcoal-700 mb-3">8. Foro</h2>
          <p>Estes termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de São Paulo – SP para dirimir eventuais conflitos.</p>
        </section>
      </div>
    </div>
  );
}

// ---- ROOT APP ----
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/clube" element={<PublicLayout><ClubePage /></PublicLayout>} />
      <Route path="/planos" element={<PublicLayout><PlanosPage /></PublicLayout>} />
      <Route path="/sobre" element={<PublicLayout><SobrePage /></PublicLayout>} />
      <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
      <Route path="/blog/:slug" element={<PublicLayout><BlogPostPage /></PublicLayout>} />
      <Route path="/loja" element={<PublicLayout><LojaPage /></PublicLayout>} />
      <Route path="/reservas" element={<PublicLayout><ReservasPage /></PublicLayout>} />
      <Route path="/cafeteria" element={<PublicLayout><CafeteriaPage /></PublicLayout>} />
      <Route path="/assinar" element={<AssinarPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/sucesso" element={<SuccessPage />} />
      <Route path="/contato" element={<PublicLayout><ContatoPage /></PublicLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacidade" element={<PublicLayout><PrivacidadePage /></PublicLayout>} />
      <Route path="/termos" element={<PublicLayout><TermosPage /></PublicLayout>} />

      {/* Client Routes */}
      <Route path="/cliente" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientDashboard /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/assinaturas" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientAssinaturas /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/pedidos" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientPedidos /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/conteudo" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientConteudo /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/avaliacoes" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientAvaliacoes /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/perfil" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientPerfil /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/rastreamentos" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientRastreamentos /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/enderecos" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientEnderecos /></ClientLayout>
        </ProtectedClientRoute>
      } />
      <Route path="/cliente/pagamentos" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientPagamentos /></ClientLayout>
        </ProtectedClientRoute>
      } />

      <Route path="/cliente/reservas" element={
        <ProtectedClientRoute>
          <ClientLayout><ClientReservas /></ClientLayout>
        </ProtectedClientRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedAdminRoute permission="dashboard">
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/pedidos" element={
        <ProtectedAdminRoute permission="pedidos">
          <AdminLayout><AdminPedidos /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/assinaturas" element={
        <ProtectedAdminRoute permission="assinaturas">
          <AdminLayout><AdminAssinaturas /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/assinaturas/planos" element={
        <ProtectedAdminRoute permission="assinaturas">
          <AdminLayout><AdminAssinaturas /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/assinaturas/edicoes" element={
        <ProtectedAdminRoute permission="assinaturas">
          <AdminLayout><AdminEdicoes /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm" element={
        <ProtectedAdminRoute permission="crm">
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm/leads" element={
        <ProtectedAdminRoute permission="crm">
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm/clientes" element={
        <ProtectedAdminRoute permission="crm">
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm/followup" element={
        <ProtectedAdminRoute permission="crm">
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/reservas" element={
        <ProtectedAdminRoute permission="reservas">
          <AdminLayout><AdminReservas /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/produtos" element={
        <ProtectedAdminRoute permission="produtos">
          <AdminLayout><AdminProdutos /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/produtos/estoque" element={
        <ProtectedAdminRoute permission="produtos">
          <AdminLayout><AdminProdutos /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/produtos/categorias" element={
        <ProtectedAdminRoute permission="produtos">
          <AdminLayout><AdminCategorias /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/blog" element={
        <ProtectedAdminRoute permission="blog">
          <AdminLayout><AdminBlog /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro" element={
        <ProtectedAdminRoute permission="financeiro">
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/receber" element={
        <ProtectedAdminRoute permission="financeiro">
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/pagar" element={
        <ProtectedAdminRoute permission="financeiro">
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/dre" element={
        <ProtectedAdminRoute permission="financeiro">
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/fluxo" element={
        <ProtectedAdminRoute permission="financeiro">
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/planejador" element={
        <ProtectedAdminRoute permission="financeiro">
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/logistica" element={
        <ProtectedAdminRoute permission="logistica">
          <AdminLayout><AdminLogistica /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/relatorios" element={
        <ProtectedAdminRoute permission="relatorios">
          <AdminLayout><AdminRelatorios /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/configuracoes" element={
        <ProtectedAdminRoute permission="configuracoes">
          <AdminLayout><AdminConfiguracoes /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/logs" element={
        <ProtectedAdminRoute permission="logs">
          <AdminLayout><AdminLogs /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/usuarios" element={
        <ProtectedAdminRoute permission="usuarios">
          <AdminLayout><AdminUsuarios /></AdminLayout>
        </ProtectedAdminRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
