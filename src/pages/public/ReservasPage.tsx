import React, { useState } from 'react';
import { Calendar, Clock, Users, Check, MapPin, Phone } from 'lucide-react';
import { Input, Select, Textarea, Button, Alert } from '../../components/ui';

type Step = 'form' | 'confirmado';

export function ReservasPage() {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    data: '',
    horario: '',
    pessoas: '2',
    observacoes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const horariosDisponiveis = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00',
  ];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nome) errs.nome = 'Nome é obrigatório';
    if (!form.email) errs.email = 'E-mail é obrigatório';
    if (!form.telefone) errs.telefone = 'Telefone é obrigatório';
    if (!form.data) errs.data = 'Data é obrigatória';
    if (!form.horario) errs.horario = 'Horário é obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setStep('confirmado');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="py-20 bg-charcoal-700 text-center">
        <p className="font-display italic text-earth-300 text-lg mb-3">Nos visite</p>
        <h1 className="font-serif text-5xl text-cream-100 mb-4">Reserva de Mesa</h1>
        <p className="text-charcoal-300 max-w-lg mx-auto">
          Reserve sua mesa na cafeteria Das Matas. Um ambiente acolhedor para você descobrir o café especial em pessoa.
        </p>
      </section>

      <section className="py-16 bg-cream-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-sm border border-cream-200 p-6">
                <h3 className="font-serif text-lg text-charcoal-700 mb-4">Informações</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-earth-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-charcoal-700">Endereço</p>
                      <p className="text-sm text-charcoal-500">Rua dos Cafezais, 245</p>
                      <p className="text-sm text-charcoal-500">São Paulo, SP</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-earth-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-charcoal-700">Horário</p>
                      <p className="text-sm text-charcoal-500">Ter – Sex: 8h às 18h</p>
                      <p className="text-sm text-charcoal-500">Sáb – Dom: 9h às 17h</p>
                      <p className="text-sm text-charcoal-400 mt-1">Fechado às segundas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-earth-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-charcoal-700">Telefone</p>
                      <p className="text-sm text-charcoal-500">(11) 99999-8888</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users size={18} className="text-earth-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-charcoal-700">Capacidade</p>
                      <p className="text-sm text-charcoal-500">Até 20 pessoas</p>
                      <p className="text-sm text-charcoal-400 mt-1">Grupos acima de 8: consulte</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-forest-500 rounded-sm p-6">
                <h4 className="font-serif text-lg text-cream-100 mb-3">O que esperar</h4>
                <ul className="space-y-2">
                  {[
                    'Ambiente acolhedor e refinado',
                    'Menu de cafés especiais',
                    'Alternativas de preparo variadas',
                    'Equipe especializada',
                    'Experiências sensoriais sob consulta',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-forest-100">
                      <Check size={14} className="text-earth-300 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {step === 'confirmado' ? (
                <div className="bg-white rounded-sm border border-cream-200 p-10 text-center">
                  <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={32} className="text-forest-500" />
                  </div>
                  <h2 className="font-serif text-3xl text-charcoal-700 mb-3">Solicitação enviada!</h2>
                  <p className="text-charcoal-500 mb-2">
                    Recebemos sua solicitação de reserva para <strong>{form.data}</strong> às <strong>{form.horario}</strong>.
                  </p>
                  <p className="text-charcoal-500 mb-8">
                    Em breve você receberá uma confirmação por e-mail em <strong>{form.email}</strong>.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setStep('form')}
                      className="px-6 py-3 border border-cream-300 text-charcoal-600 text-sm rounded-sm hover:bg-cream-50 transition-colors"
                    >
                      Nova reserva
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-sm border border-cream-200 p-8">
                  <h2 className="font-serif text-2xl text-charcoal-700 mb-6">Dados da reserva</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label="Nome completo"
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        error={errors.nome}
                        required
                        placeholder="Seu nome"
                      />
                      <Input
                        label="E-mail"
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        error={errors.email}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label="Telefone / WhatsApp"
                        value={form.telefone}
                        onChange={e => setForm({ ...form, telefone: e.target.value })}
                        error={errors.telefone}
                        required
                        placeholder="(11) 99999-9999"
                      />
                      <Select
                        label="Quantidade de pessoas"
                        value={form.pessoas}
                        onChange={e => setForm({ ...form, pessoas: e.target.value })}
                        options={Array.from({ length: 8 }, (_, i) => ({
                          value: String(i + 1),
                          label: `${i + 1} ${i === 0 ? 'pessoa' : 'pessoas'}`,
                        }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label="Data"
                        type="date"
                        value={form.data}
                        onChange={e => setForm({ ...form, data: e.target.value })}
                        min={today}
                        error={errors.data}
                        required
                      />
                      <Select
                        label="Horário"
                        value={form.horario}
                        onChange={e => setForm({ ...form, horario: e.target.value })}
                        placeholder="Selecione o horário"
                        options={horariosDisponiveis.map(h => ({ value: h, label: h }))}
                        error={errors.horario}
                        required
                      />
                    </div>

                    <Textarea
                      label="Observações (opcional)"
                      value={form.observacoes}
                      onChange={e => setForm({ ...form, observacoes: e.target.value })}
                      placeholder="Alguma ocasião especial? Preferências alimentares? Conte para a gente..."
                      rows={3}
                    />

                    <Alert
                      type="info"
                      message="As reservas ficam sujeitas à confirmação. Você receberá um e-mail em até 2 horas após a solicitação."
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      className="w-full"
                    >
                      <Calendar size={16} />
                      Solicitar Reserva
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
