// Supabase Edge Function — calcula frete via MelhorEnvio
// Se MELHOR_ENVIO_TOKEN não estiver configurado, retorna tarifa fixa de fallback.
// Deploy: supabase functions deploy calcular-frete
// Secrets: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_CEP_ORIGEM, MELHOR_ENVIO_SANDBOX (opcional)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK = [
  { id: 'flat', nome: 'Entrega padrão', empresa: 'Correios', preco: 18.90, prazo: 10 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  try {
    const token     = Deno.env.get('MELHOR_ENVIO_TOKEN');
    const cepOrigem = Deno.env.get('MELHOR_ENVIO_CEP_ORIGEM');
    const sandbox   = Deno.env.get('MELHOR_ENVIO_SANDBOX') === 'true';

    // MelhorEnvio não configurado — retorna tarifa fixa
    if (!token || !cepOrigem) {
      return json({ opcoes: FALLBACK });
    }

    const { cepDestino } = await req.json();
    const cepLimpo = String(cepDestino ?? '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return json({ error: 'CEP de destino inválido.' }, 400);
    }

    const baseUrl = sandbox
      ? 'https://sandbox.melhorenvio.com.br'
      : 'https://www.melhorenvio.com.br';

    const resp = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'DasMatas/1.0 (contato@dasmatas.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem.replace(/\D/g, '') },
        to:   { postal_code: cepLimpo },
        products: [{
          id: '1', width: 20, height: 15, length: 30,
          weight: 1.5, insurance_value: 0, quantity: 1,
        }],
        options: { receipt: false, own_hand: false },
        services: '',
      }),
    });

    if (!resp.ok) {
      console.error(`MelhorEnvio HTTP ${resp.status}`);
      return json({ opcoes: FALLBACK });
    }

    const data: unknown[] = await resp.json();
    const opcoes = (Array.isArray(data) ? data : [])
      .filter((o: any) => !o.error && parseFloat(o.price ?? '0') > 0)
      .map((o: any) => ({
        id:      String(o.id),
        nome:    o.name,
        empresa: o.company?.name ?? o.name,
        preco:   parseFloat(o.price),
        prazo:   o.delivery_time ?? 10,
      }));

    return json({ opcoes: opcoes.length > 0 ? opcoes : FALLBACK });
  } catch (err) {
    console.error('calcular-frete error:', err);
    return json({ opcoes: FALLBACK });
  }
});
