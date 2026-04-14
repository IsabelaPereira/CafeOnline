import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Play, MapPin, Thermometer, Coffee, ChevronDown,
  Star, Lock, Check, ArrowRight
} from 'lucide-react';
import { getEdicoes } from '../../services/edicoes.service';
import { Badge } from '../../components/ui';
import type { EdicaoClube } from '../../types';

function EdicaoCard({ edicao, onClick }: { edicao: EdicaoClube; onClick: () => void }) {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-sm border border-cream-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="aspect-video bg-gradient-to-br from-earth-200 to-forest-200 relative flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-3xl italic text-earth-600 opacity-60">
            {meses[edicao.mes - 1]}
          </p>
          <p className="font-display text-xl text-earth-500 opacity-50">{edicao.ano}</p>
        </div>
        {edicao.videoYoutube && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
              <Play size={20} className="text-charcoal-700 ml-1" />
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-serif text-lg text-charcoal-700 leading-tight">{edicao.titulo}</h3>
          <Badge variant="active">Exclusivo</Badge>
        </div>
        <p className="text-sm text-charcoal-500 mb-4 line-clamp-2">{edicao.descricao}</p>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {edicao.cafes.map(cafe => (
            <span key={cafe.id} className="px-2 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded-full border border-cream-200">
              {cafe.nome.split('—')[0].trim()}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-charcoal-400">{edicao.cafes.length} cafés nesta edição</span>
          <span className="text-sm text-forest-500 font-medium group-hover:text-forest-600 flex items-center gap-1">
            Ver conteúdo
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

function CafeDetail({ cafe }: { cafe: EdicaoClube['cafes'][0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-cream-50 rounded-sm border border-cream-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between p-5 text-left"
      >
        <div>
          <h4 className="font-serif text-lg text-charcoal-700 mb-1">{cafe.nome}</h4>
          <p className="text-sm text-charcoal-500">{cafe.produtor} · {cafe.regiao}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {cafe.notasSensoriais.map(n => (
              <span key={n} className="px-2 py-0.5 bg-white border border-cream-200 text-xs text-charcoal-500 rounded-full">
                {n}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown size={18} className={`text-charcoal-400 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-cream-200 pt-4 space-y-4">
          <p className="text-sm text-charcoal-600 leading-relaxed">{cafe.descricao}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Variedade', value: cafe.variedade, icon: <Coffee size={14} /> },
              { label: 'Processo', value: cafe.processo, icon: <Thermometer size={14} /> },
              { label: 'Altitude', value: cafe.altitude, icon: <MapPin size={14} /> },
              { label: 'Torra', value: cafe.torra, icon: <Coffee size={14} /> },
              { label: 'Região', value: cafe.regiao, icon: <MapPin size={14} /> },
              { label: 'Estado', value: cafe.estado, icon: <MapPin size={14} /> },
            ].map(info => (
              <div key={info.label} className="bg-white rounded-sm p-3 border border-cream-200">
                <div className="flex items-center gap-1.5 text-charcoal-400 mb-1">
                  {info.icon}
                  <span className="text-xs uppercase tracking-wider">{info.label}</span>
                </div>
                <p className="text-sm font-medium text-charcoal-700">{info.value}</p>
              </div>
            ))}
          </div>

          {cafe.curiosidades && (
            <div className="bg-earth-50 rounded-sm p-4 border border-earth-200">
              <p className="text-xs font-medium text-earth-600 uppercase tracking-wider mb-2">Curiosidade</p>
              <p className="text-sm text-charcoal-600 leading-relaxed">{cafe.curiosidades}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Sugestões de preparo</p>
            <div className="flex flex-wrap gap-2">
              {cafe.sugestoesPreparo.map(s => (
                <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-50 border border-forest-200 rounded-sm text-sm text-forest-600">
                  <Check size={12} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientConteudo() {
  const [edicoes, setEdicoes] = useState<EdicaoClube[]>([]);
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<EdicaoClube | null>(null);

  useEffect(() => {
    getEdicoes(true).then(setEdicoes).catch(console.error);
  }, []);

  if (edicaoSelecionada) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEdicaoSelecionada(null)}
            className="text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
          >
            ← Voltar
          </button>
          <div className="h-4 w-px bg-cream-300" />
          <p className="text-sm text-charcoal-500">Edições do clube</p>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl text-charcoal-700">{edicaoSelecionada.titulo}</h1>
            <Badge variant="active">Exclusivo</Badge>
          </div>
          <p className="text-charcoal-400 text-sm">
            {new Date(edicaoSelecionada.ano, edicaoSelecionada.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Descrição */}
        <div className="bg-white rounded-sm border border-cream-200 p-6">
          <p className="text-charcoal-600 leading-relaxed">{edicaoSelecionada.descricao}</p>
          {edicaoSelecionada.textoExclusivo && (
            <p className="text-charcoal-500 leading-relaxed mt-4 text-sm">{edicaoSelecionada.textoExclusivo}</p>
          )}
        </div>

        {/* Video */}
        {edicaoSelecionada.videoYoutube && (
          <div className="bg-white rounded-sm border border-cream-200 p-6">
            <h3 className="font-serif text-xl text-charcoal-700 mb-4 flex items-center gap-2">
              <Play size={20} className="text-earth-400" />
              Vídeo exclusivo
            </h3>
            <div className="aspect-video bg-charcoal-700 rounded-sm flex items-center justify-center">
              <div className="text-center">
                <Play size={48} className="text-white/50 mx-auto mb-3" />
                <p className="text-white/60 text-sm">Vídeo disponível para assinantes</p>
              </div>
            </div>
          </div>
        )}

        {/* Cafés */}
        <div>
          <h3 className="font-serif text-2xl text-charcoal-700 mb-4">Os cafés desta edição</h3>
          <div className="space-y-4">
            {edicaoSelecionada.cafes.map(cafe => (
              <CafeDetail key={cafe.id} cafe={cafe} />
            ))}
          </div>
        </div>

        {/* CTA avaliação */}
        <div className="bg-forest-500 rounded-sm p-6 text-center">
          <Star size={32} className="text-gold-400 mx-auto mb-3" />
          <h3 className="font-serif text-xl text-cream-100 mb-2">Avalie estes cafés</h3>
          <p className="text-forest-200 text-sm mb-4">Compartilhe sua experiência com a comunidade Das Matas.</p>
          <Link
            to="/cliente/avaliacoes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-earth-400 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-earth-500 transition-colors"
          >
            Avaliar agora
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Conteúdo Exclusivo</h1>
        <p className="text-charcoal-400 text-sm mt-1">
          Acesse as edições do clube com informações detalhadas sobre cada café.
        </p>
      </div>

      {/* Lock info for non-members */}
      <div className="bg-forest-50 border border-forest-200 rounded-sm p-4 flex items-center gap-3">
        <Lock size={18} className="text-forest-500 shrink-0" />
        <p className="text-sm text-forest-700">
          Conteúdo exclusivo para membros ativos do Clube Das Matas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {edicoes.map(edicao => (
          <EdicaoCard
            key={edicao.id}
            edicao={edicao}
            onClick={() => setEdicaoSelecionada(edicao)}
          />
        ))}
      </div>
    </div>
  );
}
