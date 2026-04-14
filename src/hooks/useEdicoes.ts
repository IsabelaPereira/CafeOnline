import { useAsync } from './useAsync';
import { getEdicoes } from '../services/edicoes.service';
import type { EdicaoClube } from '../types';

export function useEdicoes(apenasPublicadas = false) {
  return useAsync<EdicaoClube[]>(() => getEdicoes(apenasPublicadas), [], [apenasPublicadas]);
}
