import React, { useEffect, useState } from 'react';
import { Plus, Eye, Edit2, Globe, GlobeLock, ChevronDown, ChevronUp, Coffee, MapPin, Flame } from 'lucide-react';
import { Card, Badge, Button, Modal, Alert, Input } from '../../components/ui';
import { getEdicoes, updateEdicao, createEdicao } from '../../services/edicoes.service';
import { getPlanos } from '../../services/assinaturas.service';
import type { EdicaoClube, CafeEdicao, PlanoAssinatura } from '../../types';

const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function AdminEdicoes() {
  const [edicoes, setEdicoes] = useState<EdicaoClube[]>([]);
  const [planos, setPlanos] = useState<PlanoAssinatura[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modal, setModal] = useState<'view' | 'new' | null>(null);
  const [edicaoSel, setEdicaoSel] = useState<EdicaoClube | null>(null);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    getEdicoes().then(setEdicoes).catch(console.error);
    getPlanos().then(setPlanos).catch(console.error);
  }, []);

  // Formulário nova edição (simplificado)
  const [form, setForm] = useState({
    titulo: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    descricao: '',
  });

  function toggle(id: string) {
    setExpandido(prev => prev === id ? null : id);
  }

  function abrirVisualizar(ed: EdicaoClube) {
    setEdicaoSel(ed);
    setModal('view');
  }

  async function togglePublicado(id: string) {
    const ed = edicoes.find(e => e.id === id);
    if (!ed) return;
    const novaPublicada = !ed.publicada;
    setEdicoes(prev => prev.map(e => e.id === id ? { ...e, publicada: novaPublicada } : e));
    setSucesso(`Edição "${ed.titulo}" ${novaPublicada ? 'publicada' : 'despublicada'}.`);
    setTimeout(() => setSucesso(''), 4000);
    await updateEdicao(id, { publicada: novaPublicada }).catch(console.error);
  }

  async function handleCriarEdicao() {
    if (!form.titulo.trim()) return;
    const nova = await createEdicao({ titulo: form.titulo, mes: form.mes, ano: form.ano, descricao: form.descricao }).catch(() => null);
    if (!nova) return;
    setEdicoes(prev => [nova, ...prev]);
    setModal(null);
    setForm({ titulo: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), descricao: '' });
    setSucesso(`Edição "${nova.titulo}" criada como rascunho.`);
    setTimeout(() => setSucesso(''), 4000);
  }

  // Estatísticas
  const total = edicoes.length;
  const publicadas = edicoes.filter(e => e.publicada).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Edições do Clube</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie as edições mensais enviadas aos assinantes.</p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setModal('new')}>
          Nova edição
        </Button>
      </div>

      {sucesso && <Alert type="success" message={sucesso} onClose={() => setSucesso(null)} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de edições', value: total, color: 'text-charcoal-700' },
          { label: 'Publicadas', value: publicadas, color: 'text-forest-600' },
          { label: 'Rascunhos', value: total - publicadas, color: 'text-yellow-600' },
          { label: 'Planos ativos', value: planos.filter(p => p.ativo).length, color: 'text-earth-600' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <p className={`font-serif text-3xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-charcoal-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Lista de edições */}
      <div className="space-y-4">
        {edicoes.map(ed => {
          const aberto = expandido === ed.id;
          return (
            <Card key={ed.id} padding={false}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="shrink-0 w-12 h-12 bg-earth-100 rounded-sm flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-earth-600">{meses[ed.mes]}</span>
                      <span className="text-xs text-earth-500">{ed.ano}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg text-charcoal-700 truncate">{ed.titulo}</h3>
                        <Badge variant={ed.publicada ? 'active' : 'pending'}>
                          {ed.publicada ? 'Publicada' : 'Rascunho'}
                        </Badge>
                      </div>
                      <p className="text-sm text-charcoal-400 mt-0.5 line-clamp-1">{ed.descricao}</p>
                      <p className="text-xs text-charcoal-300 mt-1">{ed.cafes.length} café{ed.cafes.length !== 1 ? 's' : ''} nesta edição</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => abrirVisualizar(ed)}
                      className="p-2 hover:bg-cream-100 rounded-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => togglePublicado(ed.id)}
                      className={`p-2 rounded-sm transition-colors ${ed.publicada ? 'hover:bg-red-50 text-forest-500 hover:text-red-500' : 'hover:bg-forest-50 text-charcoal-400 hover:text-forest-500'}`}
                      title={ed.publicada ? 'Despublicar' : 'Publicar'}
                    >
                      {ed.publicada ? <GlobeLock size={15} /> : <Globe size={15} />}
                    </button>
                    <button
                      onClick={() => toggle(ed.id)}
                      className="p-2 hover:bg-cream-100 rounded-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
                    >
                      {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {aberto && ed.cafes.length > 0 && (
                <div className="border-t border-cream-100 px-5 pb-5">
                  <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mt-4 mb-3">Cafés desta edição</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ed.cafes.map(cafe => (
                      <CafeCard key={cafe.id} cafe={cafe} />
                    ))}
                  </div>
                </div>
              )}

              {aberto && ed.cafes.length === 0 && (
                <div className="border-t border-cream-100 px-5 py-6 text-center">
                  <Coffee size={24} className="text-charcoal-200 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-400">Nenhum café adicionado a esta edição.</p>
                  <button className="mt-2 text-xs text-forest-500 hover:text-forest-600 font-medium">
                    + Adicionar café
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal visualizar edição */}
      <Modal
        open={modal === 'view' && !!edicaoSel}
        onClose={() => setModal(null)}
        title={edicaoSel?.titulo ?? ''}
        size="lg"
      >
        {edicaoSel && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge variant={edicaoSel.publicada ? 'active' : 'pending'}>
                {edicaoSel.publicada ? 'Publicada' : 'Rascunho'}
              </Badge>
              <span className="text-sm text-charcoal-400">
                {meses[edicaoSel.mes]}/{edicaoSel.ano}
              </span>
            </div>
            <p className="text-charcoal-600 text-sm">{edicaoSel.descricao}</p>

            {edicaoSel.textoExclusivo && (
              <div className="bg-cream-50 rounded-sm p-4">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Texto exclusivo (membros)</p>
                <p className="text-sm text-charcoal-600 line-clamp-4">{edicaoSel.textoExclusivo}</p>
              </div>
            )}

            {edicaoSel.cafes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Cafés</p>
                <div className="space-y-4">
                  {edicaoSel.cafes.map(cafe => (
                    <div key={cafe.id} className="border border-cream-200 rounded-sm p-4">
                      <p className="font-serif text-base text-charcoal-700 mb-2">{cafe.nome}</p>
                      <p className="text-sm text-charcoal-500 mb-3">{cafe.descricao}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {[
                          { l: 'Produtor', v: cafe.produtor },
                          { l: 'Região', v: `${cafe.regiao} — ${cafe.estado}` },
                          { l: 'Variedade', v: cafe.variedade },
                          { l: 'Processo', v: cafe.processo },
                          { l: 'Altitude', v: cafe.altitude },
                          { l: 'Torra', v: cafe.torra },
                        ].map(item => (
                          <div key={item.l} className="bg-cream-50 rounded-sm px-3 py-2">
                            <p className="text-charcoal-400 mb-0.5">{item.l}</p>
                            <p className="font-medium text-charcoal-700">{item.v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {cafe.notasSensoriais.map(n => (
                          <span key={n} className="bg-earth-50 text-earth-600 text-xs px-2 py-0.5 rounded-full">{n}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-cream-100">
              <Button variant="secondary" onClick={() => togglePublicado(edicaoSel.id)}>
                {edicaoSel.publicada ? 'Despublicar' : 'Publicar edição'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nova edição */}
      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="Nova Edição do Clube">
        <div className="space-y-4">
          <Input
            label="Título da edição *"
            value={form.titulo}
            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
            placeholder="Ex: Edição Verão — Frutados e Naturais"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Mês</label>
              <select
                value={form.mes}
                onChange={e => setForm(p => ({ ...p, mes: Number(e.target.value) }))}
                className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
              >
                {meses.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              label="Ano"
              type="number"
              value={form.ano}
              onChange={e => setForm(p => ({ ...p, ano: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={3}
              placeholder="Breve descrição da curadoria desta edição..."
              className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
            />
          </div>
          <p className="text-xs text-charcoal-400">A edição será criada como rascunho. Adicione os cafés e publique quando estiver pronta.</p>
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" icon={<Plus size={14} />} onClick={handleCriarEdicao} disabled={!form.titulo.trim()}>
              Criar edição
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CafeCard({ cafe }: { cafe: CafeEdicao }) {
  return (
    <div className="bg-cream-50 rounded-sm p-4">
      <p className="font-serif text-sm text-charcoal-700 mb-1">{cafe.nome}</p>
      <div className="flex items-center gap-3 text-xs text-charcoal-400 mb-2">
        <span className="flex items-center gap-1"><MapPin size={10} />{cafe.regiao}</span>
        <span className="flex items-center gap-1"><Flame size={10} />{cafe.torra}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {cafe.notasSensoriais.slice(0, 3).map(n => (
          <span key={n} className="bg-white border border-cream-200 text-charcoal-500 text-xs px-2 py-0.5 rounded-full">{n}</span>
        ))}
      </div>
    </div>
  );
}
