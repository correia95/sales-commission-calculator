import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  flatCommission,
  graduatedCommission,
  cliffCommission,
  reconcileDraw,
  encodeState,
  decodeState,
} from './commission.ts';

const TIERS = [
  { upTo: 10000, rate: 5 },
  { upTo: 25000, rate: 7 },
  { upTo: null, rate: 10 },
];

test('flatCommission applies a single rate to the whole sales amount', () => {
  assert.equal(flatCommission(50000, 8), 4000);
});

test('flatCommission handles a zero rate', () => {
  assert.equal(flatCommission(50000, 0), 0);
});

test('graduatedCommission matches a hand-computed tiered example (like tax brackets)', () => {
  // $0-10k @5% = $500, $10k-25k @7% = $1,050, $25k+ @10% on the remaining $5k = $500
  assert.equal(graduatedCommission(30000, TIERS), 500 + 1050 + 500);
});

test('graduatedCommission below the first threshold uses only the first rate', () => {
  assert.equal(graduatedCommission(5000, TIERS), 250);
});

test('graduatedCommission at an exact tier boundary stays in the lower tier', () => {
  assert.equal(graduatedCommission(10000, TIERS), 500);
});

test('cliffCommission applies the whole-amount rate of the tier reached', () => {
  // $30k reaches the top (uncapped) tier, so the entire amount is at 10%
  assert.equal(cliffCommission(30000, TIERS), 3000);
});

test('cliffCommission at an exact tier boundary uses that tier (inclusive upper bound)', () => {
  assert.equal(cliffCommission(10000, TIERS), 500);
});

test('cliff and graduated methods agree only when sales sit inside the first tier', () => {
  assert.equal(cliffCommission(5000, TIERS), graduatedCommission(5000, TIERS));
});

test('graduated and cliff methods diverge once sales cross into a higher tier', () => {
  const graduated = graduatedCommission(30000, TIERS);
  const cliff = cliffCommission(30000, TIERS);
  assert.ok(cliff > graduated);
});

test('reconcileDraw reports a shortfall owed back when commission is under the draw', () => {
  const result = reconcileDraw(4000, 5000);
  assert.equal(result.payout, 0);
  assert.equal(result.owed, 1000);
});

test('reconcileDraw reports an additional payout when commission exceeds the draw', () => {
  const result = reconcileDraw(6000, 5000);
  assert.equal(result.payout, 1000);
  assert.equal(result.owed, 0);
});

test('reconcileDraw nets to zero both ways when commission exactly equals the draw', () => {
  const result = reconcileDraw(5000, 5000);
  assert.equal(result.payout, 0);
  assert.equal(result.owed, 0);
});

const FALLBACK = {
  mode: 'flat',
  salesAmount: 0,
  flatRate: 0,
  tierMethod: 'graduated',
  tiers: [],
  baseSalary: 0,
  draw: 0,
  currency: 'AUD',
};

test('encodeState/decodeState round-trips including tiers and currency', () => {
  const state = {
    mode: 'tiered',
    salesAmount: 30000,
    flatRate: 8,
    tierMethod: 'graduated',
    tiers: TIERS,
    baseSalary: 3000,
    draw: 2000,
    currency: 'USD',
  };
  const params = encodeState(state);
  const decoded = decodeState(params, FALLBACK);
  assert.deepEqual(decoded, state);
});

test('decodeState falls back to the default state for corrupted data', () => {
  const params = new URLSearchParams();
  params.set('d', 'not-valid-base64url!!!');
  assert.deepEqual(decodeState(params, FALLBACK), FALLBACK);
});

test('decodeState returns the fallback when there is no encoded state at all', () => {
  assert.deepEqual(decodeState(new URLSearchParams(), FALLBACK), FALLBACK);
});
