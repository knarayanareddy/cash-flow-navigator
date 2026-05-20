export interface MonthData {
  month: string;
  inflow: number;
  outflow: number;
  netCash: number;
  cumulativeCash: number;
  bestCase: number;
  worstCase: number;
}

export interface Levers {
  paymentDelay: number;     // days, 0-90
  newHires: number;         // 0-20, kick in from month index 6 (Jul)
  supplierIncrease: number; // %, 0-30
  revenueShift: number;     // %, -40 to +20
  creditLineOn: boolean;
  creditLineAmount: number; // €, 50k-500k
  fxShift: number;          // %, -20 to +20 (40% of inflow is international)
  churnRate: number;        // %/mo, 0-15, compounds from month 2
}

export const DEFAULT_LEVERS: Levers = {
  paymentDelay: 0,
  newHires: 0,
  supplierIncrease: 0,
  revenueShift: 0,
  creditLineOn: false,
  creditLineAmount: 100000,
  fxShift: 0,
  churnRate: 2,
};

export const PRESETS: Record<string, { label: string; emoji: string; levers: Levers }> = {
  base: {
    label: "Base Case",
    emoji: "🌤️",
    levers: { ...DEFAULT_LEVERS },
  },
  stress: {
    label: "Stress Test",
    emoji: "⛈️",
    levers: {
      ...DEFAULT_LEVERS,
      paymentDelay: 60,
      newHires: 10,
      supplierIncrease: 20,
      revenueShift: -20,
      churnRate: 6,
    },
  },
  growth: {
    label: "Growth Mode",
    emoji: "🚀",
    levers: {
      ...DEFAULT_LEVERS,
      revenueShift: 15,
      newHires: 5,
      creditLineOn: true,
      creditLineAmount: 200000,
    },
  },
};

const MONTHS = [
  "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025",
  "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025",
];

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

// Stable 12-month baseline for a fictional SaaS company.
export const BASE_DATA: MonthData[] = (() => {
  let cumulative = 50000;
  return MONTHS.map((month, i) => {
    const inflow = Math.round(95000 + seeded(i, 1) * 55000);
    const outflow = Math.round(70000 + seeded(i, 2) * 50000);
    const netCash = inflow - outflow;
    cumulative += netCash;
    return {
      month,
      inflow,
      outflow,
      netCash,
      cumulativeCash: cumulative,
      bestCase: Math.round(cumulative * 1.15),
      worstCase: Math.round(cumulative * 0.85),
    };
  });
})();

/**
 * Pure recalculation engine. Synchronous, deterministic, returns a new array.
 * Applies every lever's impact formula and recomputes cumulative + envelope.
 */
export function calculateCashFlow(baseData: MonthData[], levers: Levers): MonthData[] {
  const supplierMult = 1 + levers.supplierIncrease / 100;
  const revenueMult = 1 + levers.revenueShift / 100;
  const intlFxMult = 1 + (levers.fxShift / 100); // applied to 40% of inflow
  const delayFraction = Math.min(levers.paymentDelay / 30, 1); // portion of inflow pushed to next month
  const churnMonthly = levers.churnRate / 100;
  const hireCost = levers.newHires * 6500;
  const creditBuffer = levers.creditLineOn ? levers.creditLineAmount : 0;

  // 1) Adjusted inflow per month (before payment-delay shift)
  const adjustedInflow = baseData.map((m, i) => {
    const intlPortion = m.inflow * 0.4 * intlFxMult;
    const domesticPortion = m.inflow * 0.6;
    let inflow = (intlPortion + domesticPortion) * revenueMult;
    // Compounding churn from month 2 (index >= 1)
    const churnPower = Math.max(0, i - 1);
    inflow *= Math.pow(1 - churnMonthly, churnPower);
    return inflow;
  });

  // 2) Apply payment-delay shift: a fraction of each month's inflow lands next month
  const shiftedInflow = adjustedInflow.map((v, i, arr) => {
    const kept = v * (1 - delayFraction);
    const received = i > 0 ? arr[i - 1] * delayFraction : 0;
    return kept + received;
  });

  // 3) Adjusted outflow + cumulative
  let cumulative = 0;
  const result: MonthData[] = baseData.map((m, i) => {
    const outflow = m.outflow * supplierMult + (i >= 6 ? hireCost : 0);
    const inflow = shiftedInflow[i];
    const netCash = inflow - outflow;
    cumulative += netCash;
    const withBuffer = cumulative + creditBuffer;
    return {
      month: m.month,
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      netCash: Math.round(netCash),
      cumulativeCash: Math.round(withBuffer),
      bestCase: Math.round(withBuffer * 1.15),
      worstCase: Math.round(withBuffer * 0.85),
    };
  });

  return result;
}

export function generateNarrative(data: MonthData[], levers: Levers): string {
  const endCash = data[data.length - 1].cumulativeCash;
  const startCash = data[0].cumulativeCash;
  const delta = endCash - startCash;
  const direction = delta >= 0 ? "extends" : "compresses";
  const minMonth = data.reduce((m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m), data[0]);

  const notes: string[] = [];
  if (levers.paymentDelay > 0) notes.push(`${levers.paymentDelay}d client payment delay`);
  if (levers.newHires > 0) notes.push(`+${levers.newHires} Q3 hires`);
  if (levers.supplierIncrease > 0) notes.push(`+${levers.supplierIncrease}% supplier costs`);
  if (levers.revenueShift !== 0) notes.push(`${levers.revenueShift > 0 ? "+" : ""}${levers.revenueShift}% revenue`);
  if (levers.creditLineOn) notes.push(`€${(levers.creditLineAmount / 1000).toFixed(0)}k credit line`);
  if (levers.fxShift !== 0) notes.push(`${levers.fxShift > 0 ? "+" : ""}${levers.fxShift}% FX`);
  if (levers.churnRate !== DEFAULT_LEVERS.churnRate) notes.push(`${levers.churnRate}%/mo churn`);
  const drivers = notes.length ? ` Drivers: ${notes.join(", ")}.` : "";

  return `This scenario ${direction} runway to €${(endCash / 1000).toFixed(0)}k by year-end — a ${delta >= 0 ? "gain" : "drawdown"} of €${(Math.abs(delta) / 1000).toFixed(0)}k vs. the opening balance.${drivers} The cash trough lands in ${minMonth.month} at €${(minMonth.cumulativeCash / 1000).toFixed(0)}k; treasury should pre-position liquidity ahead of that valley. Net-net the trajectory is ${delta >= 0 ? "constructive — selective reinvestment is on the table" : "cautionary — open the hiring-freeze conversation with the board"}.`;
}
