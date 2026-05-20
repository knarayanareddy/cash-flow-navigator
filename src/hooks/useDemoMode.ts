import { useEffect, useRef, useState } from "react";
import { DEFAULT_LEVERS, PRESETS, type Levers } from "@/lib/cashflow";

/**
 * Auto-cycles levers through a curated demo sequence every ~8s.
 * Returns the current scripted levers; the caller decides whether to apply them.
 */
const SEQUENCE: Array<{ label: string; levers: Levers; ms: number }> = [
  { label: "Base Case", levers: PRESETS.base.levers, ms: 4000 },
  { label: "Stress Test", levers: PRESETS.stress.levers, ms: 8000 },
  {
    label: "Payment delay + new hires",
    levers: { ...DEFAULT_LEVERS, paymentDelay: 45, newHires: 5 },
    ms: 8000,
  },
  {
    label: "Credit line activated",
    levers: {
      ...DEFAULT_LEVERS,
      paymentDelay: 45,
      newHires: 5,
      creditLineOn: true,
      creditLineAmount: 200000,
    },
    ms: 8000,
  },
  { label: "Growth Mode", levers: PRESETS.growth.levers, ms: 6000 },
];

export function useDemoMode(opts: {
  enabled: boolean;
  onScriptedLevers: (levers: Levers, label: string) => void;
}) {
  const { enabled, onScriptedLevers } = opts;
  const [step, setStep] = useState(0);
  const cb = useRef(onScriptedLevers);
  useEffect(() => { cb.current = onScriptedLevers; }, [onScriptedLevers]);

  useEffect(() => {
    if (!enabled) {
      setStep(0);
      return;
    }
    let i = 0;
    cb.current(SEQUENCE[0].levers, SEQUENCE[0].label);
    setStep(0);
    const id = setInterval(() => {
      i = (i + 1) % SEQUENCE.length;
      setStep(i);
      cb.current(SEQUENCE[i].levers, SEQUENCE[i].label);
    }, SEQUENCE[0].ms); // simple constant cadence keeps things predictable
    return () => clearInterval(id);
  }, [enabled]);

  return { step, currentLabel: SEQUENCE[step]?.label ?? "" };
}
