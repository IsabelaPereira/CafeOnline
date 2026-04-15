// ============================================================
// TIPOS GLOBAIS — DAS MATAS
// ============================================================

// ---- AUTH ----
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'financeiro' | 'operacoes' | 'marketing' | 'conteudo' | 'atendimento' | 'estoque' | 'cliente';
  avatar?: string;
  createdAt: string;
}

// ---- CLIENTE ----
export interface Cliente {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  birthdate?: string;
  preferenciaCafe: 'grao' | 'moido';
  tipoMoagem?: 'fino' | 'medio' | 'grosso' | 'extraGrosso';
  stripeCardBrand?: string;
  stripeCardLast4?: string;
  stripeCardExpiry?: string;
  enderecos: Endereco[];
  assinaturas: Assinatura[];
  pedidos: Pedido[];
  createdAt: string;
}

export interface Endereco {
  id: string;
  apelido?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  padrao: boolean;
}

// ---- LEAD / CRM ----
export type LeadEtapa =
  | 'novo'
  | 'interesse_assinatura'
  | 'checkout_iniciado'
  | 'pagamento_iniciado'
  | 'pagamento_invalido'
  | 'pagamento_pendente'
  | 'assinatura_concluida'
  | 'interesse_reserva'
  | 'cliente_ativo'
  | 'inadimplente'
  | 'recuperacao'
  | 'perdido';

export type LeadOrigem = 'checkout' | 'reserva' | 'manual' | 'blog' | 'social' | 'indicacao' | 'landing';

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  origem: LeadOrigem;
  etapa: LeadEtapa;
  interesse?: string;
  planoDesejado?: string;
  tags: string[];
  responsavel?: string;
  ultimoContato?: string;
  proximoFollowUp?: string;
  observacoes?: string;
  clienteId?: string;
  interacoes: InteracaoCRM[];
  createdAt: string;
}

export interface InteracaoCRM {
  id: string;
  tipo: 'email' | 'whatsapp' | 'ligacao' | 'anotacao';
  descricao: string;
  data: string;
  usuario: string;
}

export interface HistoricoEtapaLead {
  id: string;
  leadId: string;
  etapaAnterior?: string;
  etapaNova: string;
  alteradoPor?: string;
  alteradoEm: string;
}

// ---- PLANOS ----
export interface PlanoAssinatura {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  beneficios: string[];
  destaque?: boolean;
  ativo: boolean;
  ordem: number;
  stripePriceId?: string;
}

// ---- ASSINATURA ----
export type StatusAssinatura = 'ativa' | 'pendente' | 'inadimplente' | 'cancelada' | 'pausada';

export interface Assinatura {
  id: string;
  clienteId: string;
  clienteNome?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  planoId: string;
  plano: PlanoAssinatura;
  status: StatusAssinatura;
  preferenciaCafe: 'grao' | 'moido';
  tipoMoagem?: string;
  enderecoId: string;
  endereco: Endereco;
  frete: number;
  totalMensal: number;
  proximaCobranca: string;
  proximoEnvio: string;
  dataInicio: string;
  dataFim?: string;
  motivoCancelamento?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  cancelamentoAgendado?: boolean;
  dataCancelamentoAgendado?: string;
  historicoCobrancas: CobrancaAssinatura[];
  historicoAlteracoes: AlteracaoAssinatura[];
  ciclos: CicloAssinatura[];
  createdAt: string;
}

export interface CobrancaAssinatura {
  id: string;
  data: string;
  valor: number;
  status: 'pago' | 'pendente' | 'falhou' | 'estornado';
  tentativas: number;
  transacaoId?: string;
  stripeInvoiceId?: string;
}

export interface AlteracaoAssinatura {
  id: string;
  tipo: string;
  de?: string;
  para?: string;
  data: string;
  usuario: string;
}

export interface CicloAssinatura {
  id: string;
  mes: number;
  ano: number;
  edicaoId?: string;
  edicaoTitulo?: string;
  status: 'pendente' | 'enviado' | 'entregue';
  codigoRastreio?: string;
  dataEnvio?: string;
  dataEntrega?: string;
  pedidoId?: string;
  pedido?: { numero: string; status: string };
  cobrancaId?: string;
}

// ---- PRODUTOS ----
export interface Produto {
  id: string;
  sku: string;
  nome: string;
  descricao: string;
  descricaoCurta: string;
  preco: number;
  precoPromocional?: number;
  estoque: number;
  estoqueMinimo: number;
  peso: number;
  fotos: string[];
  categoriaId: string;
  notasSensoriais: string[];
  regiao?: string;
  produtor?: string;
  variedade?: string;
  processo?: string;
  altitude?: string;
  torra?: string;
  ativo: boolean;
  destaque: boolean;
  produtoAssinatura: boolean;
  createdAt: string;
}

export interface CategoriaProduto {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
}

// ---- PEDIDOS ----
export type StatusPedido =
  | 'pendente'
  | 'pago'
  | 'em_separacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado'
  | 'reembolsado';

export interface Pedido {
  id: string;
  numero: string;
  clienteId: string;
  cliente?: { name: string; email: string };
  itens: ItemPedido[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  status: StatusPedido;
  enderecoEntrega: Endereco;
  formaPagamento: string;
  cupom?: string;
  codigoRastreio?: string;
  observacoes?: string;
  tipo: 'loja' | 'assinatura';
  assinaturaId?: string;
  cicloId?: string;
  melhorenvioCartId?: string;
  etiquetaUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemPedido {
  id: string;
  produtoId: string;
  produto: { nome: string; sku: string; foto?: string };
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

// ---- RESERVAS ----
export type StatusReserva =
  | 'solicitada'
  | 'confirmada'
  | 'recusada'
  | 'cancelada'
  | 'concluida'
  | 'no_show';

export interface Reserva {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  data: string;
  horario: string;
  pessoas: number;
  mesaId?: string;
  status: StatusReserva;
  observacoes?: string;
  observacoesInternas?: string;
  clienteId?: string;
  leadId?: string;
  createdAt: string;
}

export interface Mesa {
  id: string;
  numero: string;
  capacidade: number;
  ativa: boolean;
  descricao?: string;
}

// ---- EDIÇÕES DO CLUBE ----
export interface EdicaoClube {
  id: string;
  titulo: string;
  mes: number;
  ano: number;
  descricao: string;
  foto?: string;
  cafes: CafeEdicao[];
  videoYoutube?: string;
  textoExclusivo?: string;
  publicada: boolean;
  createdAt: string;
}

export interface CafeEdicao {
  id: string;
  nome: string;
  descricao: string;
  produtor: string;
  regiao: string;
  estado: string;
  variedade: string;
  processo: string;
  altitude: string;
  torra: string;
  notasSensoriais: string[];
  sugestoesPreparo: string[];
  foto?: string;
  curiosidades?: string;
}

// ---- AVALIAÇÕES ----
export interface AvaliacaoBox {
  id: string;
  clienteId: string;
  edicaoId: string;
  notaGeral: number;
  comentario?: string;
  createdAt: string;
}

export interface AvaliacaoCafe {
  id: string;
  clienteId: string;
  cafeId: string;
  edicaoId: string;
  notaGeral: number;
  aroma: number;
  docura: number;
  acidez: number;
  corpo: number;
  finalizacao: number;
  comentario?: string;
  createdAt: string;
}

// ---- BLOG ----
export type StatusPost = 'rascunho' | 'publicado' | 'agendado';

export interface PostBlog {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagemDestacada?: string;
  categorias: string[];
  tags: string[];
  autorId: string;
  autor?: string;
  status: StatusPost;
  metaTitle?: string;
  metaDescription?: string;
  publicadoEm?: string;
  agendadoPara?: string;
  visualizacoes: number;
  createdAt: string;
}

export interface CategoriaBlog {
  id: string;
  nome: string;
  slug: string;
}

// ---- FINANCEIRO ----
export type StatusFinanceiro = 'pendente' | 'recebido' | 'pago' | 'vencido' | 'cancelado';

export interface ContaReceber {
  id: string;
  descricao: string;
  clienteId?: string;
  cliente?: string;
  valor: number;
  dataVencimento: string;
  dataRecebimento?: string;
  status: StatusFinanceiro;
  categoria: string;
  subcategoria?: string;
  centroCusto?: string;
  formaPagamento?: string;
  competencia: string;
  pedidoId?: string;
  assinaturaId?: string;
  observacoes?: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  fornecedor?: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusFinanceiro;
  categoria: string;
  subcategoria?: string;
  centroCusto?: string;
  formaPagamento?: string;
  competencia: string;
  observacoes?: string;
  anexo?: string;
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  subcategorias: string[];
}

// ---- RASTREAMENTO ----
export interface Rastreamento {
  id: string;
  codigo: string;
  pedidoId?: string;
  assinaturaId?: string;
  servicoEnvio: string;
  status: string;
  eventos: EventoRastreio[];
  createdAt: string;
}

export interface EventoRastreio {
  data: string;
  local: string;
  descricao: string;
  status: string;
}

// ---- CONFIGURAÇÕES ----
export interface Configuracoes {
  empresa: {
    nome: string;
    logo?: string;
    email: string;
    telefone: string;
    whatsapp: string;
    endereco: string;
    cep: string;
    cidade: string;
    estado: string;
    instagram?: string;
    facebook?: string;
  };
  cafeteria: {
    horarios: HorarioFuncionamento[];
    capacidadeTotal: number;
    tempoReservaMins: number;
    aprovacaoAutomatica: boolean;
  };
  cobranca: {
    diaCobranca: number;
    tentativasMaximas: number;
    intervaloDiasTentativas: number;
  };
}

export interface HorarioFuncionamento {
  diaSemana: number;
  abertura: string;
  fechamento: string;
  fechado: boolean;
}
