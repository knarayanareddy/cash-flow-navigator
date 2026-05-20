import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, AlertTriangle, CheckCircle2, Infinity as InfinityIcon, Skull } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateCfoBrief, type NarrativeResult } from "@/lib/narrative.functions";
import type { MonthData, Levers } from "@/lib/cashflow";
import type { MonteCarloResult } from "@/lib/monteCarlo";

interface Props {
  scenarioName: string;
  levers: Levers;
  data: MonthData[];
  mc?: MonteCarloResult | null;
}

function hashLevers(l: Levers) {
  return JSON.stringify(l);
}

function computeKpis(data: MonthData[]) {
  const endYearCash = data[data.length - 1].cumulativeCash;
  const lowest = data.reduce((m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m), data[0]);
  const totalInflow = data.reduce((s, d) => s + d.inflow, 0);
  const totalOutflow = data.reduce((s, d) => s + d.outflow, 0);
  return {
    endYearCash,
    lowestCashMonth: lowest.month,
    lowestCashValue: lowest.cumulativeCash,
    totalInflow,
    totalOutflow,
    netCashFlow: totalInflow - totalOutflow,
    monthsNegative: data.filter((d) => d.cumulativeCash < 0).length,
  };
}

const URGENCY_STYLES: Record<NarrativeResult["urgency"], { bg: string; border: string; text: string; label: string; pulse?: boolean }> = {
  low: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    label: "✅ Cash position looks healthy",
  },
  medium: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-300",
    label: "⚠️ Monitor closely — some pressure ahead",
  },
  high: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-300",
    label: "🔶 Action recommended — risks identified",
  },
  critical: {
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    text: "text-red-300",
    label: "🚨 Critical — immediate action required",
    pulse: true,
  },
};

const LOADING_PHRASES = [
  "Analyzing cash flows…",
  "Identifying risks…",
  "Preparing recommendations…",
  "Writing CFO brief…",
];

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-white/[0.04] ${className}`}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </div>
  );
}

function LoadingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_PHRASES.length), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-5">
      <Shimmer className="mx-auto h-7 w-3/4" />
      <div className="mx-auto max-w-2xl space-y-2">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
        <Shimmer className="h-4 w-2/3" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {LOADING_PHRASES[idx]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CFONarrative({ scenarioName, levers, data, mc }: Props) {
  const generate = useServerFn(generateCfoBrief);
  const [result, setResult] = useState<NarrativeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const cacheRef = useRef<Map<string, NarrativeResult>>(new Map());
  const inFlightKey = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoadRef = useRef(true);

  const key = useMemo(() => hashLevers(levers), [levers]);
  const kpis = useMemo(() => computeKpis(data), [data]);

  const run = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = cacheRef.current.get(key);
        if (cached) {
          setResult(cached);
          setError(null);
          setGeneratedAt(Date.now());
          return;
        }
      }
      if (inFlightKey.current === key && !forceRefresh) return;
      inFlightKey.current = key;
      setLoading(true);
      setError(null);
      try {
        const r = await generate({
          data: {
            scenarioName: scenarioName || "Untitled Scenario",
            levers: levers as unknown as Record<string, unknown>,
            results: data,
            kpis,
          },
        });
        cacheRef.current.set(key, r);
        setResult(r);
        setGeneratedAt(Date.now());
      } catch (e) {
        console.error(e);
        setError("AI analysis unavailable. Please check your connection.");
      } finally {
        setLoading(false);
        inFlightKey.current = null;
      }
    },
    [generate, key, kpis, levers, data, scenarioName],
  );

  // Auto-generate on first load (1s delay), then debounce (2.5s) on lever changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = firstLoadRef.current ? 1000 : 2500;
    firstLoadRef.current = false;
    debounceRef.current = setTimeout(() => {
      void run(false);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // tick "Generated Xs ago"
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ago = generatedAt ? Math.max(0, Math.floor((now - generatedAt) / 1000)) : null;
  const agoLabel =
    ago === null ? "" : ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;

  const urgency = result?.urgency ?? "low";
  const style = URGENCY_STYLES[urgency];

  return (
    <Card className="glass-card overflow-hidden border-white/10 bg-card/60">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <h3 className="text-base font-semibold tracking-tight">CFO AI Brief</h3>
            <Badge variant="outline" className="rounded-full border-white/15 bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
              Powered by GPT-5
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {generatedAt && !loading && (
              <span className="text-xs text-muted-foreground tabular-nums">Generated {agoLabel}</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run(true)}
              disabled={loading}
              className="h-7 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result && !loading && (
            <motion.div
              key={urgency}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className={`rounded-lg border px-3 py-2 text-sm ${style.bg} ${style.border} ${style.text} ${style.pulse ? "animate-pulse" : ""}`}
            >
              {style.label}
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && <LoadingState />}

        {!loading && error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => run(true)}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && result && (
          <>
            <div className="space-y-3 text-center">
              <motion.h2
                key={result.headline}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-2xl font-bold italic leading-tight text-white"
              >
                {result.headline}
              </motion.h2>
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {result.summary}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ⚠️ Key Risks
                </h4>
                <ol className="space-y-2">
                  {result.risks.map((r, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-sm"
                    >
                      <span className="font-mono text-xs font-bold text-red-400">{i + 1}.</span>
                      <span className="text-foreground/85">{r}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ✅ Recommendations
                </h4>
                <ol className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm"
                    >
                      <span className="font-mono text-xs font-bold text-emerald-400">{i + 1}.</span>
                      <span className="text-foreground/85">{r}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>

            {result.cashRunwayMonths !== null ? (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
                <Skull className="h-5 w-5 text-red-400" />
                <span className="text-lg font-semibold text-red-200">
                  Cash Runway:{" "}
                  <span className="font-mono">{result.cashRunwayMonths}</span> months
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <InfinityIcon className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-200">
                  Cash Runway: Indefinite at current trajectory
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
