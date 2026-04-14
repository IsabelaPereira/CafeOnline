import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

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

// ---- Protected Routes ----
function ProtectedClientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isClient, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated || !isClient) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ---- CLUBE PAGE (simple redirect to planos) ----
function ClubePage() {
  return <Navigate to="/planos" replace />;
}

// ---- CONTATO PAGE ----
function ContatoPage() {
  return (
    <div className="pt-20 min-h-screen bg-cream-100">
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-serif text-4xl text-charcoal-700 mb-4">Entre em contato</h1>
        <p className="text-charcoal-500 mb-8">Estamos aqui para ajudar. Entre em contato por e-mail ou WhatsApp.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <a href="mailto:contato@dasmatas.com.br" className="bg-white rounded-sm border border-cream-200 p-6 hover:shadow-md transition-shadow">
            <p className="font-medium text-charcoal-700">E-mail</p>
            <p className="text-charcoal-500 text-sm mt-1">contato@dasmatas.com.br</p>
          </a>
          <a href="https://wa.me/5511999998888" className="bg-white rounded-sm border border-cream-200 p-6 hover:shadow-md transition-shadow">
            <p className="font-medium text-charcoal-700">WhatsApp</p>
            <p className="text-charcoal-500 text-sm mt-1">(11) 99999-8888</p>
          </a>
        </div>
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
      <Route path="/assinar" element={<AssinarPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/contato" element={<PublicLayout><ContatoPage /></PublicLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacidade" element={<PublicLayout><ContatoPage /></PublicLayout>} />
      <Route path="/termos" element={<PublicLayout><ContatoPage /></PublicLayout>} />

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

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/pedidos" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminPedidos /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/assinaturas" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminAssinaturas /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/assinaturas/planos" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminAssinaturas /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/assinaturas/edicoes" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminEdicoes /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm/leads" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/crm/clientes" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminCRM /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/reservas" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminReservas /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/produtos" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminProdutos /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/produtos/estoque" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminProdutos /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/blog" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminBlog /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/receber" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/pagar" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/dre" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/fluxo" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/financeiro/planejador" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminFinanceiro /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/logistica" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminLogistica /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/relatorios" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminRelatorios /></AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/configuracoes" element={
        <ProtectedAdminRoute>
          <AdminLayout><AdminConfiguracoes /></AdminLayout>
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
