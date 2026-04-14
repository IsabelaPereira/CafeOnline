// Supabase Edge Function — cria cliente, endereço e assinatura usando service role
// (bypassa RLS; chamada logo após supabase.auth.signUp)
// Deploy: supabase functions deploy setup-user

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Service role bypassa RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const {
      userId,
      phone,
      cpf,
      preferenciaCafe,
      tipoMoagem,
      endereco,
      planoId,
      frete,
      totalMensal,
      proximaCobranca,
      proximoEnvio,
    } = await req.json();

    if (!userId || !planoId) {
      return new Response(JSON.stringify({ error: 'userId e planoId são obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // 1. Criar cliente (ou reusar se já existe)
    let clienteId: string;
    const { data: existing } = await supabase
      .from('clientes')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      clienteId = existing.id;
    } else {
      const { data: clienteRow, error: cErr } = await supabase
        .from('clientes')
        .insert({ user_id: userId, phone, cpf: cpf || null, preferencia_cafe: preferenciaCafe, tipo_moagem: tipoMoagem || null })
        .select('id')
        .single();
      if (cErr) throw new Error(`clientes: ${cErr.message}`);
      clienteId = clienteRow.id;
    }

    // 2. Criar endereço
    const { data: endRow, error: eErr } = await supabase
      .from('enderecos')
      .insert({
        cliente_id: clienteId,
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento || null,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
        padrao: true,
      })
      .select('id')
      .single();
    if (eErr) throw new Error(`enderecos: ${eErr.message}`);
    const enderecoId = endRow.id;

    // 3. Criar assinatura (status pendente até pagamento)
    const { data: assRow, error: aErr } = await supabase
      .from('assinaturas')
      .insert({
        cliente_id: clienteId,
        plano_id: planoId,
        preferencia_cafe: preferenciaCafe,
        tipo_moagem: tipoMoagem || null,
        endereco_id: enderecoId,
        frete,
        total_mensal: totalMensal,
        proxima_cobranca: proximaCobranca,
        proximo_envio: proximoEnvio,
        status: 'pendente',
        data_inicio: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single();
    if (aErr) throw new Error(`assinaturas: ${aErr.message}`);

    return new Response(
      JSON.stringify({ clienteId, enderecoId, assinaturaId: assRow.id }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
