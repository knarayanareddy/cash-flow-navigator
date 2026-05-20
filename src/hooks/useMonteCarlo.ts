import { useEffect, useRef, useState } from "react";
import type { Levers, MonthData } from "@/lib/cashflow";
import { runMonteCarloSimulation, type MonteCarloResult } from "@/lib/monteCarlo";
import McWorker from "@/workers/monteCarlo.worker?worker";

interface State {
  result: MonteCarloResult | null;
  running: boolean;
}

export function useMonteCarlo(baseData: MonthData[], levers: Levers, debounceMs = 1000) {
  const [state, setState] = useState<State>({ result: null, running: true });
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const lastResolvedRef = useRef(0);

  // Lazily create the worker on the client
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const w = new McWorker();
      workerRef.current = w;
      w.onmessage = (e: MessageEvent) => {
        const { id, ok, result } = e.data ?? {};
        if (typeof id !== "number" || id < lastResolvedRef.current) return;
        lastResolvedRef.current = id;
        if (ok) setState({ result, running: false });
        else setState((s) => ({ ...s, running: false }));
      };
      return () => {
        w.terminate();
        workerRef.current = null;
      };
    } catch {
      // Worker unavailable — fall back to main thread (handled below)
      return;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, running: true }));
    const t = setTimeout(() => {
      if (cancelled) return;
      const id = ++reqIdRef.current;
      const w = workerRef.current;
      if (w) {
        w.postMessage({ id, baseData, levers, iterations: 1000 });
      } else {
        // Fallback (SSR / worker disabled)
        const result = runMonteCarloSimulation(baseData, levers, 1000);
        lastResolvedRef.current = id;
        setState({ result, running: false });
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [baseData, levers, debounceMs]);

  return state;
}
