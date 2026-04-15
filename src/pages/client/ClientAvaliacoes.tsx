import React, { useEffect, useState } from 'react';
import { Star, Coffee, PlayCircle, BookOpen } from 'lucide-react';
import { Card, Button, Textarea, StarRating } from '../../components/ui';
import { getEdicoes } from '../../services/edicoes.service';
import {
  getAvaliacoesBox,
  getAvaliacoesCafe,
  upsertAvaliacaoBox,
  upsertAvaliacaoCafe,
} from '../../services/avaliacoes.service';
import { useCliente } from '../../hooks/useCliente';
import type { EdicaoClube, AvaliacaoBox, AvaliacaoCafe } from '../../types';

interface AvaliacaoForm {
  notaGeral: number;
  aroma: number;
  docura: number;
  acidez: number;
  corpo: number;
  finalizacao: number;
  comentario: string;
}

const defaultForm: AvaliacaoForm = {
  notaGeral: 0, aroma: 0, docura: 0, acidez: 0, corpo: 0, finalizacao: 0, comentario: '',
};

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId = '';
    if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.get('v')) {
      videoId = u.searchParams.get('v')!;
    } else if (u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.split('/embed/')[1];
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

export function ClientAvaliacoes() {
  const { cliente } = useCliente();

  const [edicoes, setEdicoes] = useState<EdicaoClube[]>([]);
  const [selectedEdicao, setSelectedEdicao] = useState<EdicaoClube | null>(null);

  // Existing reviews loaded from DB
  const [existingBox, setExistingBox]         = useState<AvaliacaoBox | null>(null);
  const [existingCafes, setExistingCafes]     = useState<Record<string, AvaliacaoCafe>>({});

  // Form state per review target
  const [boxForm, setBoxForm]                 = useState<AvaliacaoForm>(defaultForm);
  const [cafeForms, setCafeForms]             = useState<Record<string, AvaliacaoForm>>({});


  // Loading / error per target key ('box' or cafeId)
  const [submitting, setSubmitting]           = useState<Record<string, boolean>>({});
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  // ── Load editions once ────────────────────────────────────────────────────
  useEffect(() => {
    getEdicoes(true).then(data => {
      setEdicoes(data);
      if (data.length > 0) setSelectedEdicao(data[0]);
    }).catch(console.error);
  }, []);

  // ── Load reviews when edition or client changes ───────────────────────────
  useEffect(() => {
    if (!selectedEdicao || !cliente) return;

    setExistingBox(null);
    setExistingCafes({});
    setBoxForm(defaultForm);
    setCafeForms({});
    setErrors({});

    getAvaliacoesBox(cliente.id, selectedEdicao.id).then(reviews => {
      const r = reviews[0] ?? null;
      setExistingBox(r);
      if (r) {
        setBoxForm({ notaGeral: r.notaGeral, aroma: 0, docura: 0, acidez: 0, corpo: 0, finalizacao: 0, comentario: r.comentario ?? '' });
      }
    }).catch(() => {});

    getAvaliacoesCafe(cliente.id, selectedEdicao.id).then(reviews => {
      const cafeMap: Record<string, AvaliacaoCafe> = {};
      const formMap: Record<string, AvaliacaoForm> = {};
      reviews.forEach(r => {
        cafeMap[r.cafeId] = r;
        formMap[r.cafeId] = {
          notaGeral:   r.notaGeral,
          aroma:       r.aroma,
          docura:      r.docura,
          acidez:      r.acidez,
          corpo:       r.corpo,
          finalizacao: r.finalizacao,
          comentario:  r.comentario ?? '',
        };
      });
      setExistingCafes(cafeMap);
      setCafeForms(formMap);
    }).catch(() => {});
  }, [selectedEdicao?.id, cliente?.id]);

  // ── Submit box review ─────────────────────────────────────────────────────
  const submitBox = async () => {
    if (!cliente || !selectedEdicao) return;
    setSubmitting(p => ({ ...p, box: true }));
    setErrors(p => ({ ...p, box: '' }));
    try {
      await upsertAvaliacaoBox({
        clienteId:  cliente.id,
        edicaoId:   selectedEdicao.id,
        notaGeral:  boxForm.notaGeral,
        comentario: boxForm.comentario || undefined,
      });
      setExistingBox({
        id: existingBox?.id ?? '',
        clienteId:  cliente.id,
        edicaoId:   selectedEdicao.id,
        notaGeral:  boxForm.notaGeral,
        comentario: boxForm.comentario || undefined,
        createdAt:  existingBox?.createdAt ?? new Date().toISOString(),
      });
    } catch {
      setErrors(p => ({ ...p, box: 'Não foi possível salvar. Tente novamente.' }));
    } finally {
      setSubmitting(p => ({ ...p, box: false }));
    }
  };

  // ── Submit cafe review ────────────────────────────────────────────────────
  const submitCafe = async (cafeId: string) => {
    if (!cliente || !selectedEdicao) return;
    const form = cafeForms[cafeId] ?? defaultForm;
    setSubmitting(p => ({ ...p, [cafeId]: true }));
    setErrors(p => ({ ...p, [cafeId]: '' }));
    try {
      await upsertAvaliacaoCafe({
        clienteId:   cliente.id,
        cafeId,
        edicaoId:    selectedEdicao.id,
        notaGeral:   form.notaGeral,
        aroma:       form.aroma,
        docura:      form.docura,
        acidez:      form.acidez,
        corpo:       form.corpo,
        finalizacao: form.finalizacao,
        comentario:  form.comentario || undefined,
      });
      setExistingCafes(p => ({
        ...p,
        [cafeId]: {
          id: p[cafeId]?.id ?? '',
          clienteId:   cliente.id,
          cafeId,
          edicaoId:    selectedEdicao.id,
          notaGeral:   form.notaGeral,
          aroma:       form.aroma,
          docura:      form.docura,
          acidez:      form.acidez,
          corpo:       form.corpo,
          finalizacao: form.finalizacao,
          comentario:  form.comentario || undefined,
          createdAt:   p[cafeId]?.createdAt ?? new Date().toISOString(),
        },
      }));
    } catch {
      setErrors(p => ({ ...p, [cafeId]: 'Não foi possível salvar. Tente novamente.' }));
    } finally {
      setSubmitting(p => ({ ...p, [cafeId]: false }));
    }
  };

  const updateCafeForm = (cafeId: string, patch: Partial<AvaliacaoForm>) => {
    setCafeForms(p => ({ ...p, [cafeId]: { ...(p[cafeId] ?? defaultForm), ...patch } }));
  };

  const RatingRow = ({
    label,
    value,
    onChange,
  }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-charcoal-600 w-24">{label}</span>
      <StarRating value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Minhas Avaliações</h1>
        <p className="text-charcoal-400 text-sm mt-1">Avalie as edições e cafés que você recebeu.</p>
      </div>

      {/* Edition selector */}
      <Card>
        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Edição</p>
        <div className="flex gap-2 flex-wrap">
          {edicoes.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedEdicao(e)}
              className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                selectedEdicao?.id === e.id
                  ? 'bg-forest-500 text-cream-100'
                  : 'border border-cream-300 text-charcoal-600 hover:bg-cream-50'
              }`}
            >
              {e.mes}/{e.ano}
            </button>
          ))}
        </div>
      </Card>

      {/* Edition content: description, video, exclusive text */}
      {selectedEdicao && (selectedEdicao.descricao || selectedEdicao.videoYoutube || selectedEdicao.textoExclusivo) && (
        <Card className="space-y-5">
          {/* Descricao */}
          {selectedEdicao.descricao && (
            <p className="text-charcoal-600 text-sm leading-relaxed">{selectedEdicao.descricao}</p>
          )}

          {/* Video YouTube */}
          {selectedEdicao.videoYoutube && (() => {
            const embedUrl = youtubeEmbedUrl(selectedEdicao.videoYoutube);
            if (!embedUrl) return (
              <a
                href={selectedEdicao.videoYoutube}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700 font-medium"
              >
                <PlayCircle size={18} />
                Assistir vídeo da edição
              </a>
            );
            return (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                  <PlayCircle size={13} /> Vídeo da edição
                </p>
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={embedUrl}
                    title="Vídeo da edição"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full rounded-sm"
                  />
                </div>
              </div>
            );
          })()}

          {/* Texto exclusivo */}
          {selectedEdicao.textoExclusivo && (
            <div className="border-t border-cream-100 pt-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                <BookOpen size={13} /> Conteúdo exclusivo para membros
              </p>
              <p className="text-charcoal-600 text-sm leading-relaxed whitespace-pre-line">
                {selectedEdicao.textoExclusivo}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Box evaluation */}
      {selectedEdicao && (
        <Card>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-serif text-xl text-charcoal-700">Avaliação da Box</h3>
              <p className="text-sm text-charcoal-400 mt-0.5">{selectedEdicao.titulo}</p>
            </div>
            {existingBox && (
              <span className="text-xs font-medium text-forest-500 bg-forest-50 px-2 py-1 rounded-sm">
                Avaliada
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-charcoal-600 font-medium">Nota geral</span>
              <StarRating
                value={boxForm.notaGeral}
                onChange={v => setBoxForm(p => ({ ...p, notaGeral: v }))}
                size="lg"
              />
              {boxForm.notaGeral > 0 && (
                <span className="text-charcoal-400 text-sm">{boxForm.notaGeral}/5</span>
              )}
            </div>
            <Textarea
              label="Comentário (opcional)"
              value={boxForm.comentario}
              onChange={e => setBoxForm(p => ({ ...p, comentario: e.target.value }))}
              placeholder="Como foi sua experiência com esta edição?"
              rows={3}
            />
            {errors.box && <p className="text-sm text-red-500">{errors.box}</p>}
            <Button
              variant="primary"
              loading={submitting.box}
              onClick={submitBox}
              disabled={boxForm.notaGeral === 0}
            >
              {existingBox ? 'Atualizar avaliação' : 'Enviar avaliação da box'}
            </Button>
          </div>
        </Card>
      )}

      {/* Cafés evaluation */}
      {selectedEdicao?.cafes.map(cafe => {
        const existing = existingCafes[cafe.id];
        const form     = cafeForms[cafe.id] ?? defaultForm;

        return (
          <Card key={cafe.id}>
            {/* Cabeçalho */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-earth-100 rounded-sm flex items-center justify-center shrink-0">
                  <Coffee size={18} className="text-earth-500" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-charcoal-700">{cafe.nome}</h3>
                  {(cafe.regiao || cafe.estado) && (
                    <p className="text-sm text-charcoal-400 mt-0.5">
                      {[cafe.regiao, cafe.estado].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              {existing && (
                <span className="text-xs font-medium text-forest-500 bg-forest-50 px-2 py-1 rounded-sm shrink-0">
                  Avaliado
                </span>
              )}
            </div>

            {/* Descrição */}
            {cafe.descricao && (
              <p className="text-sm text-charcoal-600 leading-relaxed mb-4">{cafe.descricao}</p>
            )}

            {/* Ficha técnica */}
            {(cafe.produtor || cafe.variedade || cafe.processo || cafe.altitude || cafe.torra) && (
              <div className="bg-cream-50 rounded-sm p-4 mb-4">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Ficha técnica</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: 'Produtor',   value: cafe.produtor  },
                    { label: 'Variedade',  value: cafe.variedade },
                    { label: 'Processo',   value: cafe.processo  },
                    { label: 'Altitude',   value: cafe.altitude  },
                    { label: 'Torra',      value: cafe.torra     },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label}>
                      <span className="text-xs text-charcoal-400">{f.label}</span>
                      <p className="text-sm text-charcoal-700 font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas sensoriais */}
            {cafe.notasSensoriais?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Notas sensoriais</p>
                <div className="flex flex-wrap gap-1.5">
                  {cafe.notasSensoriais.map(n => (
                    <span key={n} className="text-xs bg-earth-50 text-earth-700 px-2.5 py-1 rounded-sm">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Sugestões de preparo */}
            {cafe.sugestoesPreparo?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Sugestões de preparo</p>
                <div className="flex flex-wrap gap-1.5">
                  {cafe.sugestoesPreparo.map(s => (
                    <span key={s} className="text-xs bg-forest-50 text-forest-700 px-2.5 py-1 rounded-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Curiosidades */}
            {cafe.curiosidades && (
              <div className="border-t border-cream-100 pt-4 mb-4">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1.5">Curiosidades</p>
                <p className="text-sm text-charcoal-600 leading-relaxed whitespace-pre-line">{cafe.curiosidades}</p>
              </div>
            )}

            <div className="border-t border-cream-100 pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-charcoal-600 w-24">Nota geral</span>
                <StarRating
                  value={form.notaGeral}
                  onChange={v => updateCafeForm(cafe.id, { notaGeral: v })}
                  size="lg"
                />
                {form.notaGeral > 0 && (
                  <span className="text-charcoal-400 text-sm">{form.notaGeral}/5</span>
                )}
              </div>

              {/* Perfil sensorial — sempre visível */}
              <div className="space-y-3 p-4 bg-cream-50 rounded-sm">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Perfil sensorial</p>
                {([
                  { label: 'Aroma',       field: 'aroma'       as const },
                  { label: 'Doçura',      field: 'docura'      as const },
                  { label: 'Acidez',      field: 'acidez'      as const },
                  { label: 'Corpo',       field: 'corpo'       as const },
                  { label: 'Finalização', field: 'finalizacao' as const },
                ]).map(({ label, field }) => (
                  <RatingRow
                    key={field}
                    label={label}
                    value={form[field]}
                    onChange={v => updateCafeForm(cafe.id, { [field]: v })}
                  />
                ))}
              </div>

              <Textarea
                label="Comentário (opcional)"
                value={form.comentario}
                onChange={e => updateCafeForm(cafe.id, { comentario: e.target.value })}
                placeholder={`O que você achou do ${cafe.nome}?`}
                rows={3}
              />

              {errors[cafe.id] && (
                <p className="text-sm text-red-500">{errors[cafe.id]}</p>
              )}

              <Button
                variant="primary"
                loading={submitting[cafe.id]}
                disabled={form.notaGeral === 0}
                onClick={() => submitCafe(cafe.id)}
              >
                <Star size={14} />
                {existing ? 'Atualizar avaliação' : 'Enviar avaliação'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
