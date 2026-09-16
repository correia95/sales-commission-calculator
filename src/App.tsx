import { useMemo, useState } from 'react';
import {
  State, Tier, flatCommission, graduatedCommission, cliffCommission, reconcileDraw,
  encodeState, decodeState,
} from './commission';
import { CURRENCIES, guessCurrency, money } from './intl';

function defaultTiers(): Tier[] {
  return [
    { upTo: 10000, rate: 5 },
    { upTo: 25000, rate: 7 },
    { upTo: null, rate: 10 },
  ];
}

function defaultState(): State {
  return {
    mode: 'tiered',
    salesAmount: 30000,
    flatRate: 8,
    tierMethod: 'graduated',
    tiers: defaultTiers(),
    baseSalary: 3000,
    draw: 2000,
    currency: guessCurrency(),
  };
}

function readInitialState(): State {
  const params = new URLSearchParams(window.location.search);
  if ([...params.keys()].length === 0) return defaultState();
  return decodeState(params, defaultState());
}

export default function App() {
  const [state, setState] = useState<State>(readInitialState);
  const [copied, setCopied] = useState(false);

  const commission = useMemo(() => {
    if (state.mode === 'flat') return flatCommission(state.salesAmount, state.flatRate);
    return state.tierMethod === 'graduated'
      ? graduatedCommission(state.salesAmount, state.tiers)
      : cliffCommission(state.salesAmount, state.tiers);
  }, [state]);

  const totalPay = state.baseSalary + commission;
  const draw = useMemo(() => reconcileDraw(commission, state.draw), [commission, state.draw]);

  function update<K extends keyof State>(key: K, value: State[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function updateTier(index: number, field: keyof Tier, value: number | null) {
    setState((s) => ({
      ...s,
      tiers: s.tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  }

  function addTier() {
    setState((s) => {
      const tiers = [...s.tiers];
      const insertAt = tiers.length - 1;
      const prevUpTo = insertAt > 0 ? (tiers[insertAt - 1].upTo ?? 0) : 0;
      tiers.splice(insertAt, 0, { upTo: prevUpTo + 10000, rate: 0 });
      return { ...s, tiers };
    });
  }

  function removeTier(index: number) {
    setState((s) => (s.tiers.length <= 1 ? s : { ...s, tiers: s.tiers.filter((_, i) => i !== index) }));
  }

  async function shareLink() {
    const params = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', `?${params.toString()}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="page">
      <h1>Sales Commission Calculator</h1>
      <p className="lede">
        Work out commission from a flat rate or a tiered plan, plus what happens when it's checked
        against a draw.
      </p>

      <section className="panel">
        <h2>Currency</h2>
        <select value={state.currency} onChange={(e) => update('currency', e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </section>

      <section className="panel">
        <h2>Sales</h2>
        <div className="field-grid">
          <label className="field">
            <span>Sales amount this period</span>
            <input type="number" step={100} value={state.salesAmount} onChange={(e) => update('salesAmount', e.target.valueAsNumber || 0)} />
          </label>
          <label className="field">
            <span>Plan type</span>
            <select value={state.mode} onChange={(e) => update('mode', e.target.value as State['mode'])}>
              <option value="flat">Flat rate</option>
              <option value="tiered">Tiered</option>
            </select>
          </label>
          {state.mode === 'flat' && (
            <label className="field">
              <span>Commission rate (%)</span>
              <input type="number" step={0.5} value={state.flatRate} onChange={(e) => update('flatRate', e.target.valueAsNumber || 0)} />
            </label>
          )}
        </div>
      </section>

      {state.mode === 'tiered' && (
        <section className="panel">
          <h2>Tiers</h2>
          <label className="field" style={{ marginBottom: 12 }}>
            <span>Tier method</span>
            <select value={state.tierMethod} onChange={(e) => update('tierMethod', e.target.value as State['tierMethod'])}>
              <option value="graduated">Graduated (marginal, like tax brackets)</option>
              <option value="cliff">Cliff (whole amount at top tier reached)</option>
            </select>
          </label>
          {state.tiers.map((tier, i) => (
            <div className="tier-row" key={i}>
              <label className="field">
                <span>{i === state.tiers.length - 1 ? 'From' : 'Up to'}</span>
                {i === state.tiers.length - 1 ? (
                  <input type="text" value="uncapped" disabled />
                ) : (
                  <input type="number" step={1000} value={tier.upTo ?? 0} onChange={(e) => updateTier(i, 'upTo', e.target.valueAsNumber || 0)} />
                )}
              </label>
              <label className="field">
                <span>Rate (%)</span>
                <input type="number" step={0.5} value={tier.rate} onChange={(e) => updateTier(i, 'rate', e.target.valueAsNumber || 0)} />
              </label>
              <button type="button" className="remove-btn" onClick={() => removeTier(i)} disabled={state.tiers.length <= 1} aria-label="Remove tier">×</button>
            </div>
          ))}
          <button type="button" className="add-btn" onClick={addTier}>+ Add tier</button>
        </section>
      )}

      <section className="panel">
        <h2>Base &amp; draw (optional)</h2>
        <div className="field-grid">
          <label className="field">
            <span>Base salary this period</span>
            <input type="number" step={100} value={state.baseSalary} onChange={(e) => update('baseSalary', e.target.valueAsNumber || 0)} />
          </label>
          <label className="field">
            <span>Draw against commission</span>
            <input type="number" step={100} value={state.draw} onChange={(e) => update('draw', e.target.valueAsNumber || 0)} />
          </label>
        </div>
      </section>

      <section className="result positive">
        <div className="result-row">
          <div><div className="small-label">Commission earned</div><div className="big-num">{money(commission, state.currency)}</div></div>
          <div><div className="small-label">Total pay (base + commission)</div><div className="big-num">{money(totalPay, state.currency)}</div></div>
        </div>
        {state.draw > 0 && (
          <p className="verdict">
            {draw.owed > 0
              ? `Commission earned is below the ${money(state.draw, state.currency)} draw — a shortfall of ${money(draw.owed, state.currency)} (typically owed back or carried forward, depending on your plan).`
              : `Commission earned covers the ${money(state.draw, state.currency)} draw, with ${money(draw.payout, state.currency)} left over on top of it.`}
          </p>
        )}
      </section>

      <div className="actions">
        <button className="share-btn" onClick={shareLink}>{copied ? 'Copied!' : 'Copy share link'}</button>
      </div>

      <section className="explainer">
        <h2>How this works</h2>
        <p>
          A flat plan applies one rate to every dollar sold. A tiered plan splits sales into bands
          with different rates. <strong>Graduated</strong> (marginal) applies each tier's rate only to
          the portion of sales that falls in that band — like income tax brackets. <strong>Cliff</strong>{' '}
          applies the rate of whichever tier your total sales reach to the entire amount, which can
          create a sudden jump right at a threshold. A draw is a guaranteed payment made before
          commission is finalised; this calculator shows whether your earned commission covers it or
          falls short.
        </p>
        <h2>Frequently asked questions</h2>
        <h3>Which tiered method does my company use?</h3>
        <p>
          It varies by plan — check your commission agreement. The example tiers and rates above are
          placeholders; enter your own plan's thresholds and rates.
        </p>
        <h3>What happens if I don't earn back my draw?</h3>
        <p>
          Depends on the plan. A <em>recoverable</em> draw is typically deducted from a future
          commission check once you earn more than the draw. A <em>non-recoverable</em> draw is kept
          regardless. Check your agreement for which kind applies.
        </p>
        <h3>Is this financial or legal advice?</h3>
        <p>No — it's a calculator based on common commission-plan structures. Your actual compensation agreement is the authoritative source.</p>
      </section>
    </main>
  );
}
