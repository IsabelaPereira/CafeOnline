import { useAsync } from './useAsync';
import { getPedidos } from '../services/pedidos.service';
import type { Pedido } from '../types';

export function usePedidos(clienteId?: string) {
  return useAsync<Pedido[]>(() => getPedidos(clienteId), [], [clienteId]);
}
