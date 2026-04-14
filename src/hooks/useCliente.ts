import { useState, useEffect } from 'react';
import { getClienteByUserId, getEnderecos } from '../services/clientes.service';
import { getAssinaturasCliente } from '../services/assinaturas.service';
import { getPedidos } from '../services/pedidos.service';
import { useAuth } from '../contexts/AuthContext';
import type { Cliente, Endereco, Assinatura, Pedido } from '../types';

export function useCliente() {
  const { user } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getClienteByUserId(user.id).then(c => { setCliente(c); setLoading(false); });
  }, [user]);

  return { cliente, loading };
}

export function useClienteEnderecos() {
  const { cliente, loading: cLoading } = useCliente();
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) { if (!cLoading) setLoading(false); return; }
    getEnderecos(cliente.id).then(e => { setEnderecos(e); setLoading(false); });
  }, [cliente, cLoading]);

  return { enderecos, setEnderecos, cliente, loading };
}

export function useClienteAssinaturas() {
  const { cliente, loading: cLoading } = useCliente();
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) { if (!cLoading) setLoading(false); return; }
    getAssinaturasCliente(cliente.id)
      .then(a => setAssinaturas(a))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cliente, cLoading]);

  return { assinaturas, cliente, loading };
}

export function useClientePedidos() {
  const { cliente, loading: cLoading } = useCliente();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) { if (!cLoading) setLoading(false); return; }
    getPedidos(cliente.id)
      .then(p => setPedidos(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cliente, cLoading]);

  return { pedidos, cliente, loading };
}
