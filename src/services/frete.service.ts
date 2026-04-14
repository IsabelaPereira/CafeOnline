import { supabase } from '../lib/supabase';

export interface FreteOpcao {
  id: string;
  nome: string;
  empresa: string;
  preco: number;
  prazo: number; // dias úteis estimados
}

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  erro?: boolean;
}

/** Busca endereço pelo CEP via ViaCEP (API pública, sem auth). */
export async function buscarEnderecoCep(cep: string): Promise<EnderecoCep> {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) throw new Error('CEP deve ter 8 dígitos.');

  const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  if (!resp.ok) throw new Error('Não foi possível consultar o CEP.');

  const data = await resp.json();
  if (data.erro) throw new Error('CEP não encontrado. Verifique e tente novamente.');

  return {
    logradouro: data.logradouro ?? '',
    bairro:     data.bairro     ?? '',
    cidade:     data.localidade ?? '',
    estado:     data.uf         ?? '',
  };
}

/** Calcula opções de frete via Edge Function (MelhorEnvio). */
export async function calcularFrete(cepDestino: string): Promise<FreteOpcao[]> {
  const cepLimpo = cepDestino.replace(/\D/g, '');
  if (cepLimpo.length !== 8) throw new Error('CEP inválido.');

  try {
    const { data, error } = await supabase.functions.invoke('calcular-frete', {
      body: { cepDestino: cepLimpo },
    });
    if (error) throw new Error(error.message);
    return (data?.opcoes ?? []) as FreteOpcao[];
  } catch {
    // Fallback: se a Edge Function não estiver deployada
    return [{ id: 'flat', nome: 'Entrega padrão', empresa: 'Correios', preco: 18.90, prazo: 10 }];
  }
}
