import type { StatusPedido } from '../types';

/** Rótulos em pt-BR para o status do pedido (pagamento/fulfillment) —
 *  fonte única para evitar telas divergentes (ex.: uma tela sem
 *  "reembolsado", outra usando o slug cru em vez do rótulo). */
export const PEDIDO_STATUS_LABEL: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  em_separacao: 'Em separação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  disponivel_retirada: 'Disponível para retirada',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
};

export const PEDIDO_STATUS_VARIANT: Record<StatusPedido, 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold'> = {
  pendente: 'pending',
  pago: 'pending',
  em_separacao: 'gold',
  enviado: 'gold',
  entregue: 'active',
  disponivel_retirada: 'gold',
  retirado: 'active',
  cancelado: 'cancelled',
  reembolsado: 'inactive',
};

/** Status do CICLO da assinatura (progresso do envio daquele mês) —
 *  domínio diferente do status do pedido (pagamento). Usa rótulos
 *  propositalmente distintos de PEDIDO_STATUS_LABEL para não parecer
 *  a mesma informação repetida (ex.: "pendente" de ciclo = "ainda não
 *  enviado", nada a ver com "pendente" de pedido = "ainda não pago"). */
export type StatusCiclo = 'pendente' | 'enviado' | 'entregue';

export const CICLO_STATUS_LABEL: Record<StatusCiclo, string> = {
  pendente: 'Aguardando envio',
  enviado: 'Enviado',
  entregue: 'Entregue',
};

export const CICLO_STATUS_CLASS: Record<StatusCiclo, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  enviado:  'bg-blue-50 text-blue-700 border-blue-200',
  entregue: 'bg-forest-50 text-forest-700 border-forest-200',
};
