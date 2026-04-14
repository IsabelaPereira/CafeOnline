import { supabase } from '../lib/supabase';

export interface CheckoutItem {
  name: string;
  amount: number;
  quantity?: number;
}

export async function createCheckoutSession(params: {
  items: CheckoutItem[];
  successPath: string;
  cancelPath: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error as string);
  return data.url as string;
}
