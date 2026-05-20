export interface MonthData {
  month: string;
  inflow: number;
  outflow: number;
  netCash: number;
  cumulativeCash: number;
  bestCase: number;
  worstCase: number;
}

const MONTHS = [
  "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025",
  "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025",
];

// Deterministic pseudo-random for stable SSR/CSR
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

export interface Levers {
  revenueGrowth: number; // %
  churnRate: number; // %
  headcountDelta: number; // # of hires (+/-)
  marketingSpend: number; // % change
  collectionDays: number; // DSO change
  fundingInjection: number; // $
}

export const DEFAULT_LEVERS: Levers = {
  revenueGrowth: 0,
  churnRate: 0,
  headcountDelta: 0,
  marketingSpend: 0,
  collectionDays: 0,
  fundingInjection: 0,
};

export function generateScenario(levers: Levers): MonthData[] {
  let cumulative = 50000;
  const data: MonthData[] = [];

  for (let i = 0; i < 12; i++) {
    const baseInflow = 95000 + seeded(i, 1) * 55000; // 95k-150k
    const baseOutflow = 70000 + seeded(i, 2) * 50000; // 70k-120k

    const growthMultiplier = 1 + (levers.revenueGrowth / 100) * (i / 11);
    const churnMultiplier = 1 - (levers.churnRate / 100) * (i / 11);
    const inflow = baseInflow * growthMultiplier * churnMultiplier;

    const headcountCost = levers.headcountDelta * 8500;
    const marketingMultiplier = 1 + (levers.marketingSpend / 100) * 0.3;
    const outflow = baseOutflow * marketingMultiplier + headcountCost;

    const dsoEffect = -(levers.collectionDays * 250);
    const injection = i === 0 ? levers.fundingInjection : 0;

    const netCash = inflow - outflow + dsoEffect + injection;
    cumulative += netCash;

    data.push({
      month: MONTHS[i],
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      netCash: Math.round(netCash),
      cumulativeCash: Math.round(cumulative),
      bestCase: Math.round(cumulative * 1.15),
      worstCase: Math.round(cumulative * 0.85),
    });
  }

  return data;
}

export function generateNarrative(data: MonthData[], levers: Levers): string {
  const endCash = data[data.length - 1].cumulativeCash;
  const startCash = data[0].cumulativeCash;
  const delta = endCash - startCash;
  const direction = delta >= 0 ? "extends" : "compresses";
  const minMonth = data.reduce((m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m), data[0]);

  const leverNotes: string[] = [];
  if (levers.revenueGrowth !== 0) leverNotes.push(`revenue growth dialed to ${levers.revenueGrowth > 0 ? "+" : ""}${levers.revenueGrowth}%`);
  if (levers.churnRate !== 0) leverNotes.push(`churn at ${levers.churnRate}% drag`);
  if (levers.headcountDelta !== 0) leverNotes.push(`${levers.headcountDelta > 0 ? "+" : ""}${levers.headcountDelta} headcount`);
  if (levers.marketingSpend !== 0) leverNotes.push(`marketing ${levers.marketingSpend > 0 ? "+" : ""}${levers.marketingSpend}%`);
  if (levers.fundingInjection > 0) leverNotes.push(`$${(levers.fundingInjection / 1000).toFixed(0)}k injection`);
  const leversText = leverNotes.length ? ` Driven by ${leverNotes.join(", ")}.` : "";

  return `This scenario ${direction} runway to $${(endCash / 1000).toFixed(0)}k by year-end — a ${delta >= 0 ? "gain" : "drawdown"} of $${(Math.abs(delta) / 1000).toFixed(0)}k against the opening balance.${leversText} The trough lands in ${minMonth.month} at $${(minMonth.cumulativeCash / 1000).toFixed(0)}k; treasury should pre-position liquidity ahead of that valley. Net-net, the trajectory is ${delta >= 0 ? "constructive" : "cautionary"} and warrants ${delta >= 0 ? "selective reinvestment" : "a hiring freeze conversation"} with the board.`;
}
