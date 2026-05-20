/// <reference lib="webworker" />
import { runMonteCarloSimulation } from "@/lib/monteCarlo";
import type { Levers, MonthData } from "@/lib/cashflow";

export interface McRequest {
  id: number;
  baseData: MonthData[];
  levers: Levers;
  iterations?: number;
}

self.addEventListener("message", (e: MessageEvent<McRequest>) => {
  const { id, baseData, levers, iterations } = e.data;
  try {
    const result = runMonteCarloSimulation(baseData, levers, iterations ?? 1000);
    (self as unknown as Worker).postMessage({ id, ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export {};
