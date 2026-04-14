/**
 * Chama a Edge Function create-checkout via fetch direto com a anon key.
 * Isso evita o erro 401 causado por JWTs de sessão em estado inválido.
 */

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface CheckoutItem {
  name: string;
  amount: number;
  quantity?: number;
}

export interface CheckoutResult {
  url: string;
  customerId?: string;
}

export async function createCheckoutSession(params: {
  /** Itens de preço avulso — para mode: 'payment' (loja) */
  items?: CheckoutItem[];
  /** Price ID do Stripe — para mode: 'subscription' (assinatura recorrente) */
  priceId?: string;
  /** 'payment' para compras únicas; 'subscription' para cobranças recorrentes */
  mode?: 'payment' | 'subscription';
  successPath: string;
  cancelPath: string;
  metadata?: Record<string, string>;
  customerId?: string;
  customerEmail?: string;
}): Promise<CheckoutResult> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    let msg = `Erro ${resp.status} ao criar sessão de pagamento.`;
    try {
      const body = await resp.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = await resp.json();
  if (data?.error) throw new Error(data.error as string);

  return { url: data.url as string, customerId: data.customerId as string | undefined };
}
