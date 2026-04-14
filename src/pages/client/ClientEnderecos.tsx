import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Star, X, Save, Loader2 } from 'lucide-react';
import { Card, Button, Input, Alert, Modal } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  getClienteByUserId, getEnderecos, createEndereco,
  updateEndereco, deleteEndereco, definirEnderecoPadrao
} from '../../services/clientes.service';
import type { Endereco } from '../../types';

function enderecoVazio(): Omit<Endereco, 'id'> {
  return {
    apelido: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    padrao: false,
  };
}

export function ClientEnderecos() {
  const { user } = useAuth();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);

  useEffect(() => {
    if (!user) return;
    getClienteByUserId(user.id).then(c => {
      if (c) {
        setClienteId(c.id);
        getEnderecos(c.id).then(setEnderecos).catch(console.error);
      }
    }).catch(console.error);
  }, [user]);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Endereco | null>(null);
  const [form, setForm] = useState<Omit<Endereco, 'id'>>(enderecoVazio());
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [sucesso, setSucesso] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function abrirAdicionar() {
    setForm(enderecoVazio());
    setErros({});
    setEditTarget(null);
    setModal('add');
  }

  function abrirEditar(end: Endereco) {
    setForm({ apelido: end.apelido, cep: end.cep, logradouro: end.logradouro, numero: end.numero, complemento: end.complemento, bairro: end.bairro, cidade: end.cidade, estado: end.estado, padrao: end.padrao });
    setErros({});
    setEditTarget(end);
    setModal('edit');
  }

  function fechar() {
    setModal(null);
    setEditTarget(null);
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro ?? '',
          bairro: data.bairro ?? '',
          cidade: data.localidade ?? '',
          estado: data.uf ?? '',
        }));
      }
    } catch {
      // silently fail
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar() {
    const e: Record<string, string> = {};
    if (!form.cep.replace(/\D/g, '').match(/^\d{8}$/)) e.cep = 'CEP inválido';
    if (!form.logradouro.trim()) e.logradouro = 'Obrigatório';
    if (!form.numero.trim()) e.numero = 'Obrigatório';
    if (!form.bairro.trim()) e.bairro = 'Obrigatório';
    if (!form.cidade.trim()) e.cidade = 'Obrigatório';
    if (!form.estado.trim()) e.estado = 'Obrigatório';
    return e;
  }

  async function handleSalvar() {
    const e = validar();
    if (Object.keys(e).length) { setErros(e); return; }
    if (!clienteId) return;
    setSalvando(true);

    if (modal === 'add') {
      const novo = await createEndereco(clienteId, form).catch(() => null);
      if (novo) {
        setEnderecos(prev => form.padrao
          ? [novo, ...prev.map(en => ({ ...en, padrao: false }))]
          : [...prev, novo]);
        setSucesso('Endereço adicionado!');
      }
    } else if (modal === 'edit' && editTarget) {
      await updateEndereco(editTarget.id, clienteId, form).catch(console.error);
      setEnderecos(prev => prev.map(en =>
        en.id === editTarget.id ? { ...en, ...form } : form.padrao ? { ...en, padrao: false } : en
      ));
      setSucesso('Endereço atualizado!');
    }
    setSalvando(false);
    fechar();
    setTimeout(() => setSucesso(''), 4000);
  }

  async function handleDefinirPadrao(id: string) {
    if (!clienteId) return;
    await definirEnderecoPadrao(id, clienteId).catch(console.error);
    setEnderecos(prev => prev.map(en => ({ ...en, padrao: en.id === id })));
  }

  async function handleExcluir(id: string) {
    await deleteEndereco(id).catch(console.error);
    setEnderecos(prev => prev.filter(en => en.id !== id));
    setConfirmDelete(null);
    setSucesso('Endereço removido.');
    setTimeout(() => setSucesso(''), 3000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Meus Endereços</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie seus endereços de entrega.</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={abrirAdicionar}>
          Novo endereço
        </Button>
      </div>

      {sucesso && <Alert type="success" message={sucesso} />}

      {enderecos.length === 0 ? (
        <Card className="text-center py-16">
          <MapPin size={48} className="text-charcoal-200 mx-auto mb-3" />
          <p className="font-serif text-xl text-charcoal-500">Nenhum endereço cadastrado</p>
          <p className="text-sm text-charcoal-400 mt-1 mb-5">Adicione um endereço para receber seus pedidos.</p>
          <Button variant="primary" onClick={abrirAdicionar} icon={<Plus size={14} />}>Adicionar endereço</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {enderecos.map(end => (
            <Card key={end.id} className={end.padrao ? 'ring-2 ring-forest-400' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-earth-400 shrink-0 mt-0.5" />
                  <span className="font-medium text-charcoal-700 text-sm">{end.apelido || 'Endereço'}</span>
                  {end.padrao && (
                    <span className="flex items-center gap-1 text-xs text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                      <Star size={10} fill="currentColor" /> Padrão
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(end)} className="p-1.5 hover:bg-cream-100 rounded-sm text-charcoal-400 hover:text-charcoal-600 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  {!end.padrao && (
                    <button onClick={() => setConfirmDelete(end.id)} className="p-1.5 hover:bg-red-50 rounded-sm text-charcoal-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-charcoal-600">
                {end.logradouro}, {end.numero}{end.complemento ? ` — ${end.complemento}` : ''}
              </p>
              <p className="text-sm text-charcoal-600">{end.bairro}</p>
              <p className="text-sm text-charcoal-600">{end.cidade} / {end.estado}</p>
              <p className="text-xs text-charcoal-400 mt-1">CEP: {end.cep}</p>
              {!end.padrao && (
                <button
                  onClick={() => handleDefinirPadrao(end.id)}
                  className="mt-3 text-xs text-forest-500 hover:text-forest-600 font-medium"
                >
                  Definir como padrão
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal add/edit */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={fechar}
        title={modal === 'add' ? 'Novo Endereço' : 'Editar Endereço'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Apelido (ex: Casa, Trabalho)"
            value={form.apelido ?? ''}
            onChange={e => setForm(p => ({ ...p, apelido: e.target.value }))}
            placeholder="Apelido opcional"
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 relative">
              <Input
                label="CEP *"
                value={form.cep}
                onChange={e => { setForm(p => ({ ...p, cep: e.target.value })); buscarCep(e.target.value); }}
                placeholder="00000-000"
                error={erros.cep}
              />
              {buscandoCep && <Loader2 size={14} className="absolute right-3 top-9 animate-spin text-charcoal-400" />}
            </div>
            <Input
              label="Número *"
              value={form.numero}
              onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
              error={erros.numero}
            />
          </div>
          <Input
            label="Logradouro *"
            value={form.logradouro}
            onChange={e => setForm(p => ({ ...p, logradouro: e.target.value }))}
            error={erros.logradouro}
          />
          <Input
            label="Complemento"
            value={form.complemento ?? ''}
            onChange={e => setForm(p => ({ ...p, complemento: e.target.value }))}
            placeholder="Apto, bloco, etc."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bairro *"
              value={form.bairro}
              onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
              error={erros.bairro}
            />
            <Input
              label="Cidade *"
              value={form.cidade}
              onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
              error={erros.cidade}
            />
          </div>
          <Input
            label="Estado (UF) *"
            value={form.estado}
            onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))}
            placeholder="MG"
            error={erros.estado}
          />
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={form.padrao}
              onChange={e => setForm(p => ({ ...p, padrao: e.target.checked }))}
              className="w-4 h-4 accent-forest-500"
            />
            <span className="text-sm text-charcoal-600">Definir como endereço padrão</span>
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={fechar}>Cancelar</Button>
            <Button variant="primary" icon={<Save size={14} />} loading={salvando} onClick={handleSalvar}>
              Salvar endereço
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmação de exclusão */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover endereço">
        <p className="text-charcoal-600 mb-6">Tem certeza que deseja remover este endereço?</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => handleExcluir(confirmDelete!)}>
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  );
}
