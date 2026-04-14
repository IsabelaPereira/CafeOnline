import { useAsync } from './useAsync';
import { getReservas, getMesas } from '../services/reservas.service';
import type { Reserva, Mesa } from '../types';

export function useReservas(data?: string) {
  return useAsync<Reserva[]>(() => getReservas(data), [], [data]);
}

export function useMesas() {
  return useAsync<Mesa[]>(getMesas, []);
}
