import { useAsync } from './useAsync';
import { getProdutos, getCategoriasProduto } from '../services/produtos.service';
import type { Produto, CategoriaProduto } from '../types';

export function useProdutos(apenasAtivos = false) {
  return useAsync<Produto[]>(() => getProdutos(apenasAtivos), [], [apenasAtivos]);
}

export function useCategoriasProduto() {
  return useAsync<CategoriaProduto[]>(getCategoriasProduto, []);
}
