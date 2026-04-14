import { useAsync } from './useAsync';
import { getDashboardData } from '../services/dashboard.service';
import type { DashboardData } from '../services/dashboard.service';

const INITIAL: DashboardData = {
  receitaMensal: 0, despesasMensais: 0, assinaturasAtivas: 0,
  inadimplentes: 0, pedidosPendentes: 0, reservasHoje: 0, leadsNovos: 0, mrr: 0,
  evolucaoAssinaturas: [], receitaPorMes: [], planoDistribuicao: [],
};

export function useDashboard() {
  return useAsync<DashboardData>(getDashboardData, INITIAL);
}
