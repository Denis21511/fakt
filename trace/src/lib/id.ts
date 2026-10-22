export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Без 0/O и 1/I/L — токен иногда читают с наклейки и вводят вручную */
const TOKEN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function passportToken(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  return out;
}

/** 7K2M9QXAHB → «7K2M 9QXA HB» для чтения глазами */
export function groupToken(token: string): string {
  return token.match(/.{1,4}/g)?.join(' ') ?? token;
}
