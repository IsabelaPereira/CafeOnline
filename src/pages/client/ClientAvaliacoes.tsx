import React, { useEffect, useState } from 'react';
import { Star, Check, Coffee } from 'lucide-react';
import { Card, Button, Textarea, StarRating } from '../../components/ui';
import { getEdicoes } from '../../services/edicoes.service';
import type { EdicaoClube } from '../../types';

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

export function ClientAvaliacoes() {
  const [edicoes, setEdicoes] = useState<EdicaoClube[]>([]);
  const [selectedEdicao, setSelectedEdicao] = useState<EdicaoClube | null>(null);
  const [selectedCafe, setSelectedCafe] = useState<string | null>(null);

  useEffect(() => {
    getEdicoes(true).then(data => {
      setEdicoes(data);
      if (data.length > 0) setSelectedEdicao(data[0]);
    }).catch(console.error);
  }, []);
  const [form, setForm] = useState<AvaliacaoForm>(defaultForm);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    const key = selectedCafe ?? 'box';
    setSubmitted(prev => [...prev, key]);
    setForm(defaultForm);
    setSelectedCafe(null);
  };

  const RatingRow = ({ label, field }: { label: string; field: keyof AvaliacaoForm }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-charcoal-600 w-24">{label}</span>
      <StarRating
        value={Number(form[field]) || 0}
        onChange={v => setForm(prev => ({ ...prev, [field]: v }))}
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Minhas Avaliações</h1>
        <p className="text-charcoal-400 text-sm mt-1">Avalie as edições e cafés que você recebeu.</p>
      </div>

      {/* Edição selector */}
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

      {/* Box evaluation */}
      {selectedEdicao && <Card>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-serif text-xl text-charcoal-700">Avaliação da Box</h3>
            <p className="text-sm text-charcoal-400 mt-0.5">{selectedEdicao.titulo}</p>
          </div>
          {submitted.includes('box') && (
            <div className="flex items-center gap-1.5 text-sm text-forest-500">
              <Check size={16} />
              Avaliada
            </div>
          )}
        </div>

        {submitted.includes('box') ? (
          <p className="text-sm text-charcoal-500">Você já avaliou esta edição. Obrigado pelo feedback!</p>
        ) : selectedCafe === null ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-charcoal-600 font-medium">Nota geral</span>
              <StarRating
                value={form.notaGeral}
                onChange={v => setForm(prev => ({ ...prev, notaGeral: v }))}
                size="lg"
              />
              {form.notaGeral > 0 && (
                <span className="text-charcoal-400 text-sm">{form.notaGeral}/5</span>
              )}
            </div>
            <Textarea
              label="Comentário (opcional)"
              value={form.comentario}
              onChange={e => setForm(prev => ({ ...prev, comentario: e.target.value }))}
              placeholder="Como foi sua experiência com esta edição?"
              rows={3}
            />
            <Button
              variant="primary"
              loading={loading}
              onClick={() => { setSelectedCafe(null); handleSubmit(); }}
              disabled={form.notaGeral === 0}
            >
              Enviar avaliação da box
            </Button>
          </div>
        ) : null}
      </Card>}

      {/* Cafés evaluation */}
      {selectedEdicao?.cafes.map(cafe => (
        <Card key={cafe.id}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-earth-100 rounded-sm flex items-center justify-center shrink-0">
                <Coffee size={18} className="text-earth-500" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-charcoal-700">{cafe.nome}</h3>
                <p className="text-sm text-charcoal-400">{cafe.regiao} · {cafe.processo}</p>
              </div>
            </div>
            {submitted.includes(cafe.id) && (
              <div className="flex items-center gap-1.5 text-sm text-forest-500">
                <Check size={16} />
                Avaliado
              </div>
            )}
          </div>

          {submitted.includes(cafe.id) ? (
            <p className="text-sm text-charcoal-500">Avaliação registrada. Obrigado!</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-charcoal-600 w-24">Nota geral</span>
                <StarRating
                  value={selectedCafe === cafe.id ? form.notaGeral : 0}
                  onChange={v => {
                    setSelectedCafe(cafe.id);
                    setForm({ ...defaultForm, notaGeral: v });
                  }}
                  size="lg"
                />
              </div>

              {selectedCafe === cafe.id && (
                <>
                  <div className="space-y-3 p-4 bg-cream-50 rounded-sm">
                    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Perfil sensorial</p>
                    <RatingRow label="Aroma" field="aroma" />
                    <RatingRow label="Doçura" field="docura" />
                    <RatingRow label="Acidez" field="acidez" />
                    <RatingRow label="Corpo" field="corpo" />
                    <RatingRow label="Finalização" field="finalizacao" />
                  </div>

                  <Textarea
                    label="Comentário"
                    value={form.comentario}
                    onChange={e => setForm(prev => ({ ...prev, comentario: e.target.value }))}
                    placeholder={`O que você achou do ${cafe.nome}?`}
                    rows={3}
                  />

                  <Button
                    variant="primary"
                    loading={loading}
                    onClick={() => {
                      setSubmitted(prev => [...prev, cafe.id]);
                      setForm(defaultForm);
                      setSelectedCafe(null);
                    }}
                    disabled={form.notaGeral === 0}
                  >
                    <Star size={14} />
                    Enviar avaliação
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
