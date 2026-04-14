import { useAsync } from './useAsync';
import { getAssinaturas, getAssinaturasCliente, getPlanos } from '../services/assinaturas.service';
import type { Assinatura, PlanoAssinatura } from '../types';

export function useAssinaturas() {
  return useAsync<Assinatura[]>(getAssinaturas, []);
}

export function useAssinaturasCliente(clienteId?: string) {
  return useAsync<Assinatura[]>(
    () => clienteId ? getAssinaturasCliente(clienteId) : Promise.resolve([]),
    [],
    [clienteId]
  );
}

export function usePlanos() {
  return useAsync<PlanoAssinatura[]>(getPlanos, []);
}
