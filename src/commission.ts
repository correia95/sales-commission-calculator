export interface Tier {
  upTo: number | null;
  rate: number;
}

interface Bound {
  lower: number;
  upper: number;
  rate: number;
}

function tierBounds(tiers: Tier[]): Bound[] {
  let lower = 0;
  return tiers.map((t) => {
    const upper = t.upTo === null ? Infinity : t.upTo;
    const bound: Bound = { lower, upper, rate: t.rate };
    lower = upper;
    return bound;
  });
}

export function flatCommission(sales: number, ratePercent: number): number {
  return sales * (ratePercent / 100);
}

export function graduatedCommission(sales: number, tiers: Tier[]): number {
  const bounds = tierBounds(tiers);
  let total = 0;
  for (const b of bounds) {
    if (sales <= b.lower) break;
    const amountInTier = Math.min(sales, b.upper) - b.lower;
    total += amountInTier * (b.rate / 100);
  }
  return total;
}

export function cliffCommission(sales: number, tiers: Tier[]): number {
  const bounds = tierBounds(tiers);
  for (const b of bounds) {
    if (sales <= b.upper) {
      return sales * (b.rate / 100);
    }
  }
  return 0;
}

export interface DrawResult {
  payout: number;
  owed: number;
}

export function reconcileDraw(commission: number, draw: number): DrawResult {
  if (commission >= draw) {
    return { payout: commission - draw, owed: 0 };
  }
  return { payout: 0, owed: draw - commission };
}

export type TierMethod = 'graduated' | 'cliff';

export interface State {
  mode: 'flat' | 'tiered';
  salesAmount: number;
  flatRate: number;
  tierMethod: TierMethod;
  tiers: Tier[];
  baseSalary: number;
  draw: number;
  currency: string;
}

function toUint8Array(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function toBase64Url(text: string): string {
  const bytes = toUint8Array(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeState(state: State): URLSearchParams {
  const params = new URLSearchParams();
  params.set('d', toBase64Url(JSON.stringify(state)));
  return params;
}

export function decodeState(params: URLSearchParams, fallback: State): State {
  const raw = params.get('d');
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.salesAmount !== 'number') {
      return fallback;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
