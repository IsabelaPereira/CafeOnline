import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Das Matas] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.\n' +
    'Preencha o arquivo .env.local com os valores do painel Supabase.'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ---- Tipos de banco (snake_case → mapeados nos services) ----
export type Tables = {
  profiles:               { id: string; name: string; role: string; avatar_url: string | null; created_at: string };
  clientes:               { id: string; user_id: string | null; phone: string | null; cpf: string | null; birthdate: string | null; preferencia_cafe: string | null; tipo_moagem: string | null; created_at: string };
  enderecos:              { id: string; cliente_id: string; apelido: string | null; cep: string; logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; estado: string; padrao: boolean; created_at: string };
  planos:                 { id: string; nome: string; descricao: string | null; preco: number; beneficios: string[]; destaque: boolean; ativo: boolean; ordem: number; created_at: string };
  assinaturas:            { id: string; cliente_id: string; plano_id: string; status: string; preferencia_cafe: string | null; tipo_moagem: string | null; endereco_id: string | null; frete: number; total_mensal: number; proxima_cobranca: string | null; proximo_envio: string | null; data_inicio: string; data_fim: string | null; motivo_cancelamento: string | null; created_at: string };
  cobrancas_assinatura:   { id: string; assinatura_id: string; data: string; valor: number; status: string; tentativas: number; transacao_id: string | null; created_at: string };
  alteracoes_assinatura:  { id: string; assinatura_id: string; tipo: string; de: string | null; para: string | null; data: string; usuario: string | null };
  ciclos_assinatura:      { id: string; assinatura_id: string; mes: number; ano: number; edicao_id: string | null; status: string; codigo_rastreio: string | null; data_envio: string | null; data_entrega: string | null };
  categorias_produto:     { id: string; nome: string; slug: string; descricao: string | null };
  produtos:               { id: string; sku: string; nome: string; descricao: string | null; descricao_curta: string | null; preco: number; preco_promocional: number | null; estoque: number; estoque_minimo: number; peso: number | null; fotos: string[]; categoria_id: string | null; notas_sensoriais: string[]; regiao: string | null; produtor: string | null; variedade: string | null; processo: string | null; altitude: string | null; torra: string | null; ativo: boolean; destaque: boolean; produto_assinatura: boolean; created_at: string };
  pedidos:                { id: string; numero: string; cliente_id: string | null; subtotal: number; frete: number; desconto: number; total: number; status: string; endereco_entrega: Record<string, string>; forma_pagamento: string | null; cupom: string | null; codigo_rastreio: string | null; observacoes: string | null; created_at: string; updated_at: string };
  itens_pedido:           { id: string; pedido_id: string; produto_id: string | null; nome_produto: string; sku_produto: string | null; quantidade: number; preco_unitario: number; subtotal: number };
  mesas:                  { id: string; numero: string; capacidade: number; ativa: boolean; descricao: string | null };
  leads:                  { id: string; nome: string; email: string; telefone: string | null; origem: string | null; etapa: string; interesse: string | null; plano_desejado: string | null; tags: string[]; responsavel: string | null; ultimo_contato: string | null; proximo_follow_up: string | null; observacoes: string | null; cliente_id: string | null; created_at: string };
  interacoes_crm:         { id: string; lead_id: string; tipo: string; descricao: string; data: string; usuario: string | null };
  reservas:               { id: string; nome: string; email: string; telefone: string | null; data: string; horario: string; pessoas: number; mesa_id: string | null; status: string; observacoes: string | null; observacoes_internas: string | null; cliente_id: string | null; lead_id: string | null; created_at: string };
  edicoes_clube:          { id: string; titulo: string; mes: number; ano: number; descricao: string | null; foto: string | null; video_youtube: string | null; texto_exclusivo: string | null; publicada: boolean; created_at: string };
  cafes_edicao:           { id: string; edicao_id: string; nome: string; descricao: string | null; produtor: string | null; regiao: string | null; estado: string | null; variedade: string | null; processo: string | null; altitude: string | null; torra: string | null; notas_sensoriais: string[]; sugestoes_preparo: string[]; foto: string | null; curiosidades: string | null };
  categorias_blog:        { id: string; nome: string; slug: string };
  posts_blog:             { id: string; titulo: string; slug: string; resumo: string | null; conteudo: string | null; imagem_destacada: string | null; autor_id: string | null; status: string; meta_title: string | null; meta_description: string | null; publicado_em: string | null; agendado_para: string | null; visualizacoes: number; created_at: string };
  categorias_financeiras: { id: string; nome: string; tipo: string; subcategorias: string[] };
  contas_receber:         { id: string; descricao: string; cliente_id: string | null; valor: number; data_vencimento: string; data_recebimento: string | null; status: string; categoria: string; subcategoria: string | null; centro_custo: string | null; forma_pagamento: string | null; competencia: string; pedido_id: string | null; assinatura_id: string | null; observacoes: string | null; created_at: string };
  contas_pagar:           { id: string; descricao: string; fornecedor: string | null; valor: number; data_vencimento: string; data_pagamento: string | null; status: string; categoria: string; subcategoria: string | null; centro_custo: string | null; forma_pagamento: string | null; competencia: string; observacoes: string | null; anexo_url: string | null; created_at: string };
  avaliacoes_box:         { id: string; cliente_id: string; edicao_id: string; nota_geral: number | null; comentario: string | null; created_at: string };
  avaliacoes_cafe:        { id: string; cliente_id: string; cafe_id: string; edicao_id: string; nota_geral: number | null; aroma: number | null; docura: number | null; acidez: number | null; corpo: number | null; finalizacao: number | null; comentario: string | null; created_at: string };
  configuracoes:          { id: number; empresa: Record<string, unknown>; cafeteria: Record<string, unknown>; cobranca: Record<string, unknown> };
  lead_abandonment_checks:{ id: string; lead_id: string; assinatura_id: string | null; scheduled_at: string; processed_at: string | null; result: string | null; created_at: string };
};
