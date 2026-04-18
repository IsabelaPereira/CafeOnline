export interface PermissionDef {
  key: string;
  label: string;
  descricao: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: 'dashboard',      label: 'Painel',              descricao: 'Visão geral e KPIs' },
  { key: 'pedidos',        label: 'Pedidos',             descricao: 'Gerenciar pedidos e envios' },
  { key: 'assinaturas',    label: 'Assinaturas',         descricao: 'Assinantes, planos e edições do clube' },
  { key: 'crm',            label: 'CRM / Leads',         descricao: 'Funil de leads, clientes e follow-up' },
  { key: 'reservas',       label: 'Reservas',            descricao: 'Reservas da cafeteria' },
  { key: 'produtos',       label: 'Produtos',            descricao: 'Catálogo, estoque e categorias' },
  { key: 'blog',           label: 'Editorial / Blog',    descricao: 'Posts e conteúdo editorial' },
  { key: 'financeiro',     label: 'Financeiro',          descricao: 'Contas a pagar/receber, DRE e fluxo' },
  { key: 'logistica',      label: 'Logística',           descricao: 'Rastreamento e entregas' },
  { key: 'relatorios',     label: 'Relatórios',          descricao: 'Relatórios e analytics' },
  { key: 'logs',           label: 'Logs de Auditoria',   descricao: 'Histórico de operações do sistema' },
  { key: 'configuracoes',  label: 'Configurações',       descricao: 'Configurações gerais do sistema' },
  { key: 'usuarios',       label: 'Gestão de Usuários',  descricao: 'Criar e gerenciar acessos de equipe' },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

export const ADMIN_ROLES = [
  { value: 'admin',        label: 'Administrador' },
  { value: 'financeiro',   label: 'Financeiro' },
  { value: 'operacoes',    label: 'Operações' },
  { value: 'marketing',    label: 'Marketing' },
  { value: 'conteudo',     label: 'Conteúdo' },
  { value: 'atendimento',  label: 'Atendimento' },
  { value: 'estoque',      label: 'Estoque' },
] as const;

export function getPermissionForRoute(pathname: string): string | null {
  if (pathname === '/admin') return 'dashboard';
  const seg = pathname.replace(/^\/admin\//, '').split('/')[0];
  if (!seg) return 'dashboard';
  const match = PERMISSIONS.find(p => p.key === seg);
  return match ? match.key : null;
}

const PERMISSION_ROUTE_MAP: Record<string, string> = {
  dashboard: '/admin',
  pedidos: '/admin/pedidos',
  assinaturas: '/admin/assinaturas',
  crm: '/admin/crm',
  reservas: '/admin/reservas',
  produtos: '/admin/produtos',
  blog: '/admin/blog',
  financeiro: '/admin/financeiro',
  logistica: '/admin/logistica',
  relatorios: '/admin/relatorios',
  logs: '/admin/logs',
  configuracoes: '/admin/configuracoes',
  usuarios: '/admin/usuarios',
};

export function getFirstAllowedRoute(permissions: string[]): string {
  for (const perm of PERMISSIONS) {
    if (permissions.includes(perm.key)) {
      return PERMISSION_ROUTE_MAP[perm.key] ?? '/admin';
    }
  }
  return '/admin';
}
