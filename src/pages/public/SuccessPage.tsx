import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, Star } from 'lucide-react';
import { updatePedidoStatus } from '../../services/pedidos.service';
import { updateAssinaturaStatus } from '../../services/assinaturas.service';

export function SuccessPage() {
  const [params] = useSearchParams();
  const tipo = params.get('tipo') ?? 'pedido'; // 'pedido' | 'assinatura'
  const id   = params.get('id') ?? '';

  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) { setDone(true); return; }
    const update = tipo === 'assinatura'
      ? updateAssinaturaStatus(id, 'ativa')
      : updatePedidoStatus(id, 'pago');
    update.catch(console.error).finally(() => setDone(true));
  }, [id, tipo]);

  if (!done) {
    return (
      <div className="pt-20 min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPedido = tipo === 'pedido';

  return (
    <div className="pt-20 min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-sm border border-cream-200 shadow-sm p-10 text-center">
        <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-forest-500" />
        </div>

        <h1 className="font-serif text-3xl text-charcoal-700 mb-3">
          {isPedido ? 'Pedido confirmado!' : 'Assinatura confirmada!'}
        </h1>

        <p className="text-charcoal-500 mb-2">
          {isPedido
            ? 'Seu pagamento foi processado com sucesso.'
            : 'Bem-vindo ao Clube Das Matas! Sua assinatura está ativa.'}
        </p>

        <p className="text-sm text-charcoal-400 mb-8">
          Você receberá um e-mail com os detalhes em instantes.
        </p>

        <div className="flex flex-col gap-3">
          {isPedido ? (
            <>
              <Link
                to="/cliente/pedidos"
                className="flex items-center justify-center gap-2 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors"
              >
                <Package size={16} />
                Acompanhar pedido
              </Link>
              <Link to="/loja" className="text-sm text-charcoal-400 hover:text-charcoal-600">
                Continuar comprando
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/cliente"
                className="flex items-center justify-center gap-2 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors"
              >
                <Star size={16} />
                Acessar minha conta
              </Link>
              <Link to="/" className="text-sm text-charcoal-400 hover:text-charcoal-600">
                Voltar ao início
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
