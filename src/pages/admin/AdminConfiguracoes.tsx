import React, { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Card, Button, Input, Textarea, SectionHeader, Tabs } from '../../components/ui';
import { getConfiguracoes, saveConfiguracoes } from '../../services/configuracoes.service';

export function AdminConfiguracoes() {
  const [tab, setTab] = useState('empresa');
  const [loading, setLoading]   = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [empresa, setEmpresa] = useState({
    nome: '', email: '', telefone: '', whatsapp: '',
    endereco: '', cep: '', cidade: '', estado: '',
    instagram: '', facebook: '',
  });

  const [cobranca, setCobranca] = useState({
    diaCobranca: '5', tentativasMaximas: '3', intervaloDiasTentativas: '3',
  });

  useEffect(() => {
    getConfiguracoes().then(cfg => {
      setEmpresa({
        nome:      cfg.empresa.nome      ?? '',
        email:     cfg.empresa.email     ?? '',
        telefone:  cfg.empresa.telefone  ?? '',
        whatsapp:  cfg.empresa.whatsapp  ?? '',
        endereco:  cfg.empresa.endereco  ?? '',
        cep:       cfg.empresa.cep       ?? '',
        cidade:    cfg.empresa.cidade    ?? '',
        estado:    cfg.empresa.estado    ?? '',
        instagram: cfg.empresa.instagram ?? '',
        facebook:  cfg.empresa.facebook  ?? '',
      });
      setCobranca({
        diaCobranca:             String(cfg.cobranca.diaCobranca             ?? 5),
        tentativasMaximas:       String(cfg.cobranca.tentativasMaximas       ?? 3),
        intervaloDiasTentativas: String(cfg.cobranca.intervaloDiasTentativas ?? 3),
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSalvarEmpresa() {
    setSalvando(true);
    try {
      await saveConfiguracoes({
        empresa: {
          nome:      empresa.nome,
          email:     empresa.email,
          telefone:  empresa.telefone,
          whatsapp:  empresa.whatsapp,
          endereco:  empresa.endereco,
          cep:       empresa.cep,
          cidade:    empresa.cidade,
          estado:    empresa.estado,
          instagram: empresa.instagram || undefined,
          facebook:  empresa.facebook  || undefined,
        },
      });
      setSavedMsg('Salvo!');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch { alert('Erro ao salvar configurações.'); }
    finally { setSalvando(false); }
  }

  async function handleSalvarCobranca() {
    setSalvando(true);
    try {
      await saveConfiguracoes({
        cobranca: {
          diaCobranca:             parseInt(cobranca.diaCobranca)             || 5,
          tentativasMaximas:       parseInt(cobranca.tentativasMaximas)       || 3,
          intervaloDiasTentativas: parseInt(cobranca.intervaloDiasTentativas) || 3,
        },
      });
      setSavedMsg('Salvo!');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch { alert('Erro ao salvar configurações.'); }
    finally { setSalvando(false); }
  }

  const e = (field: keyof typeof empresa) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEmpresa(p => ({ ...p, [field]: ev.target.value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-charcoal-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Configurações" subtitle="Configurações gerais do sistema" />

      <Tabs
        tabs={[
          { id: 'empresa',  label: 'Empresa' },
          { id: 'cobranca', label: 'Cobrança' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── EMPRESA ────────────────────────────────────────────────────── */}
      {tab === 'empresa' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-6">Dados da empresa</h3>
          <div className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nome da empresa" value={empresa.nome}     onChange={e('nome')} />
              <Input label="E-mail de contato" type="email" value={empresa.email} onChange={e('email')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Telefone"  value={empresa.telefone}  onChange={e('telefone')} placeholder="(11) 99999-8888" />
              <Input label="WhatsApp"  value={empresa.whatsapp}  onChange={e('whatsapp')} placeholder="5511999998888" />
            </div>
            <Input label="Endereço" value={empresa.endereco} onChange={e('endereco')} placeholder="Rua, número, bairro" />
            <div className="grid grid-cols-3 gap-4">
              <Input label="CEP"    value={empresa.cep}    onChange={e('cep')}    placeholder="00000-000" />
              <Input label="Cidade" value={empresa.cidade} onChange={e('cidade')} placeholder="São Paulo" />
              <Input label="Estado (UF)" value={empresa.estado} onChange={e('estado')} placeholder="SP" maxLength={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Instagram" value={empresa.instagram} onChange={e('instagram')} placeholder="@dasmatas" />
              <Input label="Facebook"  value={empresa.facebook}  onChange={e('facebook')}  placeholder="dasmatas" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleSalvarEmpresa} disabled={salvando}>
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar configurações
              </Button>
              {savedMsg && <span className="text-sm text-forest-600 font-medium">{savedMsg}</span>}
            </div>
          </div>
        </Card>
      )}

      {/* ── COBRANÇA ───────────────────────────────────────────────────── */}
      {tab === 'cobranca' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-6">Configurações de cobrança</h3>
          <div className="space-y-5 max-w-lg">
            <Input
              label="Dia de cobrança das assinaturas"
              type="number" min="1" max="28"
              value={cobranca.diaCobranca}
              onChange={ev => setCobranca(p => ({ ...p, diaCobranca: ev.target.value }))}
              hint="Dia do mês em que as cobranças são processadas"
            />
            <Input
              label="Tentativas máximas de cobrança"
              type="number" min="1" max="10"
              value={cobranca.tentativasMaximas}
              onChange={ev => setCobranca(p => ({ ...p, tentativasMaximas: ev.target.value }))}
              hint="Número de tentativas antes de marcar como inadimplente"
            />
            <Input
              label="Intervalo entre tentativas (dias)"
              type="number" min="1"
              value={cobranca.intervaloDiasTentativas}
              onChange={ev => setCobranca(p => ({ ...p, intervaloDiasTentativas: ev.target.value }))}
            />
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleSalvarCobranca} disabled={salvando}>
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar configurações
              </Button>
              {savedMsg && <span className="text-sm text-forest-600 font-medium">{savedMsg}</span>}
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
