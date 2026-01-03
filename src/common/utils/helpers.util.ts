import * as crypto from 'crypto';

const UNWANTED_PREAMBLES = [
  /^(Sure!|Certainly!|Absolutely!|Great!|Of course!|Here'?s?|I'?ll|Let me|I will|I'd be happy to)[^\n]*\n+/i,
  /^(Here is|Here are|Below is|Below are)[^\n]*\n+/i,
  /^(I've created|I've generated|I've prepared|I've analyzed|I've put together|I've refined)[^\n]*\n+/i,
  /^(This is|Here's an?|Here's the)[^\n]*(upgraded|enhanced|improved|better|sarcastic|engaging|analysis|refined)[^\n]*\n+/i,
  /^[^\n]*take on your request[^\n]*\n+/i,
  /^[^\n]*(version|take|response):[^\n]*\n+/i,
  /^(Market Analysis|Analysis Summary|Refined version|Here's the refined|The refined)[^\n]*\n+/i,
];

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
  secret: string,
): Promise<boolean> {
  const hash = await hashPassword(password, secret);
  return hash === hashedPassword;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function cleanAIResponse(response: string): string {
  let cleaned = response.trim();
  for (const pattern of UNWANTED_PREAMBLES) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.replace(/^---+\n+/, '');
  cleaned = cleaned.replace(/^\*\*+\n+/, '');
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  return cleaned.trim();
}

export function calculateTokens(input: string, output: string): number {
  return Math.ceil(input.length / 4) + Math.ceil(output.length / 4);
}

export function countWords(content: string): number {
  return content
    .split(/\s+/)
    .filter(Boolean).length;
}
