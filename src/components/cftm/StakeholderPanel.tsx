import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  Tooltip as RTooltip,
} from "recharts";
import {
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Users,
  Fish,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENTS,
  simulateStakeholders,
  type AgentId,
  type AgentReaction,
  type StakeholderResult,
} from "@/lib/stakeholders.functions";
import type { MonthData, Levers } from "@/lib/cashflow";
import type { MonteCarloResult } from "@/lib/monteCarlo";

interface Props {
  scenarioName: string;
  levers: Levers;
  data: MonthData[];
  mc?: MonteCarloResult | null;
  narrative?: { headline?: string; summary?: string; urgency?: string } | null;
  onResult?: (r: StakeholderResult) => void;
}

function computeKpis(data: MonthData[]) {
  const endYearCash = data[data.length - 1].cumulativeCash;
  const lowest = data.reduce(
    (m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m),
    data[0],
  );
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

const SENTIMENT_COLORS: Record<AgentReaction["sentiment"], string> = {
  positive: "#10b981",
  neutral: "#94a3b8",
  concerned: "#f59e0b",
  alarmed: "#ef4444",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function useTypewriter(text: string, speed = 12) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

function SentimentMeter({ score }: { score: number }) {
  // -100..100 → 0..100%
  const pct = Math.round(((score + 100) / 200) * 100);
  const color =
    score >= 40
      ? "#10b981"
      : score >= 0
        ? "#94a3b8"
        : score >= -40
          ? "#f59e0b"
          : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500/20 via-slate-500/20 to-emerald-500/20">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Alarmed</span>
        <span className="font-mono tabular-nums text-foreground/70">
          {score > 0 ? `+${score}` : score}
        </span>
        <span>Positive</span>
      </div>
    </div>
  );
}

function AgentCard({
  reaction,
  index,
}: {
  reaction: AgentReaction;
  index: number;
}) {
  const meta = AGENTS.find((a) => a.id === reaction.agentId)!;
  const [expanded, setExpanded] = useState(false);
  const typed = useTypewriter(reaction.reaction, 10);
  const showFull = expanded || typed.length >= reaction.reaction.length;
  const sentimentColor = SENTIMENT_COLORS[reaction.sentiment];

  return (
    <motion.div
      layout
      layoutId={`agent-${reaction.agentId}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.15 }}
      className="relative flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: meta.color }}
        >
          {initials(meta.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {meta.name}
            </p>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: sentimentColor }}
            />
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: sentimentColor }}
            >
              {reaction.sentiment}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{meta.role}</p>
        </div>
      </div>

      <SentimentMeter score={reaction.sentimentScore} />

      <div className="relative rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <p className="text-sm italic leading-relaxed text-foreground/85">
          “{showFull ? reaction.reaction : typed}
          {!showFull && (
            <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-foreground/60 align-middle" />
          )}
          {showFull && "”"}
        </p>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border-red-500/30 bg-red-500/10 text-[10px] font-medium text-red-300 hover:bg-red-500/15">
                ⚠ {reaction.topConcern}
              </Badge>
              <Badge className="rounded-full border-blue-500/30 bg-blue-500/10 text-[10px] font-medium text-blue-300 hover:bg-blue-500/15">
                → {reaction.suggestedAction}
              </Badge>
            </div>
            {reaction.agreesWith.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Agrees with:{" "}
                {reaction.agreesWith
                  .map((id) => AGENTS.find((a) => a.id === id)?.name ?? id)
                  .join(", ")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? "Hide details" : "Show concern & action"}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </motion.div>
  );
}

function ConsensusGauge({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const color =
    score >= 40
      ? "#10b981"
      : score >= 0
        ? "#94a3b8"
        : score >= -40
          ? "#f59e0b"
          : "#ef4444";
  const data = [{ name: "consensus", value: pct, fill: color }];
  return (
    <div className="relative h-40 w-full">
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "rgba(255,255,255,0.05)" }}
            dataKey="value"
            cornerRadius={8}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span
          className="font-mono text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {score > 0 ? `+${score}` : score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Room Sentiment
        </span>
      </div>
    </div>
  );
}

function SentimentTimeline({ reactions }: { reactions: AgentReaction[] }) {
  const data = reactions.map((r) => {
    const meta = AGENTS.find((a) => a.id === r.agentId)!;
    return {
      name: meta.name.split(" ")[0],
      score: r.sentimentScore,
      fill: SENTIMENT_COLORS[r.sentiment],
    };
  });
  return (
    <div className="h-36 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <RTooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "rgba(15,15,20,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} animationDuration={800}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const THINKING_PHRASES = [
  "Elena is reviewing the numbers…",
  "Marcus is checking portfolio benchmarks…",
  "Priya is rerunning the sensitivity model…",
  "James wants the executive summary…",
  "Sandra is checking covenants…",
];

const UNAVAILABLE_COPY: Record<NonNullable<StakeholderResult["unavailableReason"]>, { title: string; body: string }> = {
  credits: {
    title: "AI credits exhausted",
    body: "The war room simulation is paused until credits are added in workspace settings. Forecasts and charts remain available.",
  },
  rate_limit: {
    title: "War room is rate limited",
    body: "Wait a moment, then reconvene the stakeholder room.",
  },
  configuration: {
    title: "War room is not configured",
    body: "The AI gateway needs configuration before stakeholder reactions can run.",
  },
  gateway: {
    title: "War room is temporarily unavailable",
    body: "Try reconvening shortly.",
  },
};

function LoadingRoom() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [pulseIdx, setPulseIdx] = useState(0);
  useEffect(() => {
    const t1 = setInterval(
      () => setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length),
      1400,
    );
    const t2 = setInterval(() => setPulseIdx((i) => (i + 1) % AGENTS.length), 350);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="flex items-center gap-4">
        {AGENTS.map((a, i) => (
          <div key={a.id} className="flex flex-col items-center gap-2">
            <motion.div
              animate={{
                scale: pulseIdx === i ? 1.2 : 1,
                opacity: pulseIdx === i ? 1 : 0.4,
              }}
              transition={{ duration: 0.3 }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white shadow-lg"
              style={{ backgroundColor: a.color }}
            >
              {initials(a.name)}
            </motion.div>
            <span className="text-[10px] text-muted-foreground">
              {a.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={phraseIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-sm italic text-muted-foreground"
        >
          {THINKING_PHRASES[phraseIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function StakeholderPanel({
  scenarioName,
  levers,
  data,
  mc,
  narrative,
  onResult,
}: Props) {
  const generate = useServerFn(simulateStakeholders);
  const [result, setResult] = useState<StakeholderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, StakeholderResult>>(new Map());
  const inFlightKey = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoadRef = useRef(true);

  const key = useMemo(() => JSON.stringify(levers), [levers]);
  const kpis = useMemo(() => computeKpis(data), [data]);

  const run = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = cacheRef.current.get(key);
        if (cached) {
          setResult(cached);
          setError(null);
          return;
        }
      }
      if (inFlightKey.current === key && !force) return;
      inFlightKey.current = key;
      setLoading(true);
      setError(null);
      try {
        const r = await generate({
          data: {
            scenarioName: scenarioName || "Untitled Scenario",
            levers: levers as unknown as Record<string, unknown>,
            kpis,
            narrative: narrative ?? undefined,
            monteCarlo: mc
              ? {
                  medianEndYear: mc.summary.medianEndYear,
                  worstCaseEndYear: mc.summary.worstCaseEndYear,
                  bestCaseEndYear: mc.summary.bestCaseEndYear,
                  maxProbabilityNegative: mc.summary.maxProbabilityNegative,
                  dangerMonths: mc.summary.dangerMonths,
                }
              : undefined,
          },
        });
        if (!r.unavailableReason) cacheRef.current.set(key, r);
        setResult(r);
        if (!r.unavailableReason) onResult?.(r);
      } catch (e) {
        console.error(e);
        setError("War room unavailable. Please check your connection.");
      } finally {
        setLoading(false);
        inFlightKey.current = null;
      }
    },
    [generate, key, kpis, levers, scenarioName, narrative, mc, onResult],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = firstLoadRef.current ? 1200 : 2500;
    firstLoadRef.current = false;
    debounceRef.current = setTimeout(() => {
      void run(false);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // sort: most alarmed first
  const sorted = useMemo(
    () =>
      result
        ? [...result.reactions].sort((a, b) => a.sentimentScore - b.sentimentScore)
        : [],
    [result],
  );

  return (
    <Card className="glass-card border-white/10 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold tracking-tight">
            👥 Stakeholder War Room
          </CardTitle>
          <Badge
            variant="outline"
            className="gap-1 rounded-full border-white/15 bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            <Fish className="h-2.5 w-2.5" />
            5 agents analyzing
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => run(true)}
          disabled={loading}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Reconvene
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && <LoadingRoom />}

        {!loading && error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => run(true)}>
              Retry
            </Button>
          </div>
        )}

        {!loading && result?.unavailableReason && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-300" />
            <p className="text-sm font-semibold text-amber-100">
              {UNAVAILABLE_COPY[result.unavailableReason].title}
            </p>
            <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-amber-100/80">
              {UNAVAILABLE_COPY[result.unavailableReason].body}
            </p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => run(true)}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && result && !result.unavailableReason && (
          <>
            <motion.div
              layout
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              <AnimatePresence>
                {sorted.map((r, i) => (
                  <AgentCard key={r.agentId} reaction={r} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                🏛 Room Consensus
              </h4>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <ConsensusGauge score={result.consensus.averageSentiment} />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">
                    Points of Agreement
                  </p>
                  <ul className="space-y-1">
                    {result.consensus.agreements.map((a, i) => (
                      <li key={i} className="flex gap-2 text-xs text-foreground/80">
                        <span className="text-emerald-400">✓</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                    Points of Conflict
                  </p>
                  <ul className="space-y-1">
                    {result.consensus.conflicts.map((c, i) => (
                      <li
                        key={i}
                        className="flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1.5 text-xs text-amber-100"
                      >
                        <span className="text-amber-400">⚡</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {result.consensus.recommendation && (
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.06] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                    Synthesized Recommendation
                  </p>
                  <p className="mt-1 text-sm italic text-foreground/90">
                    {result.consensus.recommendation}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sentiment by Agent
              </h4>
              <SentimentTimeline reactions={result.reactions} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
