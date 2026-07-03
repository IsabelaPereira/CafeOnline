// ─── Validações e máscaras compartilhadas ──────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValido(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isTelefoneValido(telefone: string): boolean {
  const digitos = telefone.replace(/\D/g, '');
  return digitos.length === 10 || digitos.length === 11;
}

/** Aplica a máscara (XX) XXXXX-XXXX / (XX) XXXX-XXXX enquanto o usuário digita. */
export function formatTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return d.length ? `(${d}` : '';
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
