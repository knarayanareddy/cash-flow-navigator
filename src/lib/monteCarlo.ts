import type { Levers, MonthData } from "./cashflow";

export interface MonteCarloBand {
  month: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  probabilityNegative: number;
}

export interface MonteCarloSummary {
  worstCaseEndYear: number;
  bestCaseEndYear: number;
  medianEndYear: number;
  maxProbabilityNegative: number;
  dangerMonths: string[];
}

export interface MonteCarloResult {
  bands: MonteCarloBand[];
  summary: MonteCarloSummary;
  iterations: number;
  durationMs: number;
}

// Box-Muller transform → standard normal sample
function randNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Right-skewed log-normal sample, mean ~1
function randLogNormal(sigma: number): number {
  return Math.exp(randNormal() * sigma - (sigma * sigma) / 2);
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const w = idx - lo;
  return sortedAsc[lo] * (1 - w) + sortedAsc[hi] * w;
}

export function runMonteCarloSimulation(
  baseData: MonthData[],
  levers: Levers,
  iterations = 1000,
): MonteCarloResult {
  const t0 =
    typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

  const supplierMult = 1 + levers.supplierIncrease / 100;
  const revenueMult = 1 + levers.revenueShift / 100;
  const intlFxMult = 1 + levers.fxShift / 100;
  const delayFraction = Math.min(levers.paymentDelay / 30, 1);
  const churnMonthly = levers.churnRate / 100;
  const hireCost = levers.newHires * 6500;
  const creditBuffer = levers.creditLineOn ? levers.creditLineAmount : 0;
  // Right-skewed delay variance — bigger when payment delay is larger.
  const delaySigma = 0.05 + (levers.paymentDelay / 90) * 0.25;

  const N = baseData.length;

  // Deterministic adjusted base (mean of each month before noise)
  const adjInflowMean = baseData.map((m, i) => {
    const intl = m.inflow * 0.4 * intlFxMult;
    const dom = m.inflow * 0.6;
    let inflow = (intl + dom) * revenueMult;
    const churnPower = Math.max(0, i - 1);
    inflow *= Math.pow(1 - churnMonthly, churnPower);
    return inflow;
  });
  const adjOutflowMean = baseData.map((m, i) => m.outflow * supplierMult + (i >= 6 ? hireCost : 0));

  // Allocate columns of cumulative values per month for percentile calc.
  const cols: number[][] = Array.from({ length: N }, () => new Array<number>(iterations));
  const negativeCounts = new Array<number>(N).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    // 1) Sample inflows / outflows with normal noise
    const inflowSamples = new Array<number>(N);
    const outflowSamples = new Array<number>(N);
    let churnDrift = 1;
    for (let i = 0; i < N; i++) {
      // Churn drift adds compounding uncertainty over time
      if (i > 0 && churnMonthly > 0) {
        churnDrift *= 1 + randNormal() * churnMonthly * 0.5;
      }
      const inflowSigma = adjInflowMean[i] * 0.08;
      const outflowSigma = adjOutflowMean[i] * 0.05;
      inflowSamples[i] = Math.max(0, adjInflowMean[i] * churnDrift + randNormal() * inflowSigma);
      outflowSamples[i] = Math.max(0, adjOutflowMean[i] + randNormal() * outflowSigma);
    }

    // 2) Apply right-skewed payment-delay shift per iteration
    const shifted = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      const localDelay = Math.min(1, delayFraction * randLogNormal(delaySigma));
      const kept = inflowSamples[i] * (1 - localDelay);
      const received = i > 0 ? inflowSamples[i - 1] * localDelay : 0;
      shifted[i] = kept + received;
    }

    // 3) Cumulative cash per month
    let cum = 0;
    for (let i = 0; i < N; i++) {
      cum += shifted[i] - outflowSamples[i];
      const withBuffer = cum + creditBuffer;
      cols[i][iter] = withBuffer;
      if (withBuffer < 0) negativeCounts[i] += 1;
    }
  }

  // 4) Percentiles per month
  const bands: MonteCarloBand[] = baseData.map((m, i) => {
    const sorted = cols[i].slice().sort((a, b) => a - b);
    return {
      month: m.month,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
      probabilityNegative: negativeCounts[i] / iterations,
    };
  });

  const last = bands[bands.length - 1];
  let maxProb = 0;
  const dangerMonths: string[] = [];
  for (const b of bands) {
    if (b.probabilityNegative > maxProb) maxProb = b.probabilityNegative;
    if (b.probabilityNegative > 0.2) dangerMonths.push(b.month);
  }

  const t1 =
    typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

  return {
    bands,
    summary: {
      worstCaseEndYear: last.p10,
      bestCaseEndYear: last.p90,
      medianEndYear: last.p50,
      maxProbabilityNegative: maxProb,
      dangerMonths,
    },
    iterations,
    durationMs: Math.round(t1 - t0),
  };
}
