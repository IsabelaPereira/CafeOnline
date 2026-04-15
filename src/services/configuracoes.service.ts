import { supabase } from '../lib/supabase';
import type { Configuracoes, HorarioFuncionamento } from '../types';

const DIAS_SEMANA: HorarioFuncionamento[] = [0, 1, 2, 3, 4, 5, 6].map(d => ({
  diaSemana: d, abertura: '08:00', fechamento: '18:00', fechado: d === 0,
}));

const DEFAULT_CONFIG: Configuracoes = {
  empresa: { nome: 'Das Matas', email: '', telefone: '', whatsapp: '', endereco: '', cep: '', cidade: '', estado: '' },
  cafeteria: { horarios: DIAS_SEMANA, capacidadeTotal: 24, aprovacaoAutomaticaAte: 0, tempoAntecedenciaMin: 60 },
  cobranca: { diaCobranca: 5, tentativasMaximas: 3, intervaloDiasTentativas: 3 },
};

function parseConfig(row: any): Configuracoes {
  const emp = row.empresa  ?? {};
  const caf = row.cafeteria ?? {};
  const cob = row.cobranca  ?? {};

  return {
    empresa: {
      nome:      emp.nome      ?? '',
      logo:      emp.logo      ?? undefined,
      email:     emp.email     ?? '',
      telefone:  emp.telefone  ?? '',
      whatsapp:  emp.whatsapp  ?? '',
      endereco:  emp.endereco  ?? '',
      cep:       emp.cep       ?? '',
      cidade:    emp.cidade    ?? '',
      estado:    emp.estado    ?? '',
      instagram: emp.instagram ?? undefined,
      facebook:  emp.facebook  ?? undefined,
    },
    cafeteria: {
      horarios:              (caf.horarios ?? DIAS_SEMANA) as HorarioFuncionamento[],
      capacidadeTotal:       caf.capacidadeTotal       ?? 24,
      aprovacaoAutomaticaAte: caf.aprovacaoAutomaticaAte ?? (caf.aprovacaoAutomatica ? 999 : 0),
      tempoAntecedenciaMin:  caf.tempoAntecedenciaMin  ?? 60,
    },
    cobranca: {
      diaCobranca:             cob.diaCobranca             ?? 5,
      tentativasMaximas:       cob.tentativasMaximas       ?? 3,
      intervaloDiasTentativas: cob.intervaloDiasTentativas ?? 3,
    },
  };
}

export async function getConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
  if (error || !data) return DEFAULT_CONFIG;
  return parseConfig(data);
}

export async function saveConfiguracoes(patch: Partial<Configuracoes>): Promise<void> {
  const current = await getConfiguracoes();
  const merged: Configuracoes = {
    empresa:  { ...current.empresa,  ...(patch.empresa  ?? {}) },
    cafeteria: { ...current.cafeteria, ...(patch.cafeteria ?? {}) },
    cobranca:  { ...current.cobranca,  ...(patch.cobranca  ?? {}) },
  };
  const { error } = await supabase.from('configuracoes').upsert({
    id: 1, empresa: merged.empresa, cafeteria: merged.cafeteria, cobranca: merged.cobranca,
  });
  if (error) throw error;
}
