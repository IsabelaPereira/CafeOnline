import { useAsync } from './useAsync';
import { getContasReceber, getContasPagar, getCategorias, getDashboardFinanceiro } from '../services/financeiro.service';
import type { ContaReceber, ContaPagar, CategoriaFinanceira } from '../types';

export function useContasReceber(competencia?: string) {
  return useAsync<ContaReceber[]>(() => getContasReceber(competencia), [], [competencia]);
}

export function useContasPagar(competencia?: string) {
  return useAsync<ContaPagar[]>(() => getContasPagar(competencia), [], [competencia]);
}

export function useCategoriasFinanceiras() {
  return useAsync<CategoriaFinanceira[]>(getCategorias, []);
}

export function useDashboardFinanceiro() {
  return useAsync(getDashboardFinanceiro, { receitaTotal: 0, receitaRecebida: 0, despesaTotal: 0, despesaPaga: 0, lucroLiquido: 0, mrr: 0 });
}
