# Sales Commission Calculator

Work out sales commission from a flat rate or a tiered plan, plus what
happens when it's checked against a draw.

- Flat-rate commission (one rate on the whole sales amount)
- Tiered commission, either graduated (marginal, like tax brackets)
  or cliff (whole amount at the rate of the highest tier reached)
- Total pay = base salary + commission
- Draw-against-commission reconciliation (shortfall owed back, or
  payout on top of the draw)
- Shareable link (base64url-encoded)

## Develop

```
npm install
npm run dev
npm run build      # tsc --noEmit && vite build
node --experimental-strip-types --test src/commission.test.mjs
```

The engine (`flatCommission`, `graduatedCommission`, `cliffCommission`,
`reconcileDraw`) is in `src/commission.ts`. 15 Node tests in
`src/commission.test.mjs`, including a hand-computed tiered example
and boundary cases for where a tier begins and ends.

## Deploy

Static assets on Cloudflare Workers (`wrangler.jsonc`). Live at
<https://sales-commission-calculator.correia95.workers.dev/>.
