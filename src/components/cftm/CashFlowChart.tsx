import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Area,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingDown, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import type { MonthData } from "@/lib/cashflow";
import type { MonteCarloResult } from "@/lib/monteCarlo";

interface Props {
  data: MonthData[];
  mc?: MonteCarloResult | null;
  mcRunning?: boolean;
}

const COLORS = {
  indigo: "#6366F1",
  emerald: "#10B981",
  red: "#EF4444",
  grid: "#1F2937",
  muted: "#6B7280",
};

function fmtAxis(v: number) {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `€${(v / 1000).toFixed(0)}k`;
  return `€${v.toFixed(0)}`;
}

function fmtCurrency(v: number) {
  const sign = v < 0 ? "-" : "";
  return `${sign}€${Math.abs(Math.round(v)).toLocaleString()}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div
      className="rounded-lg border shadow-2xl backdrop-blur-xl"
      style={{ background: COLORS.grid, borderColor: "#374151", borderRadius: 8 }}
    >
      <div className="border-b border-white/5 px-3 py-2">
        <p className="text-sm font-bold text-white">{label}</p>
      </div>
      <div className="space-y-1.5 px-3 py-2.5 text-xs">
        <Row label="Inflow" value={fmtCurrency(row.inflow)} color={COLORS.emerald} />
        <Row label="Outflow" value={fmtCurrency(row.outflow)} color={COLORS.red} />
        <Row
          label="Net"
          value={fmtCurrency(row.netCash)}
          color={row.netCash >= 0 ? COLORS.emerald : COLORS.red}
        />
        <div className="my-1 h-px bg-white/10" />
        <Row label="Base case" value={fmtCurrency(row.cumulativeCash)} color="#FFFFFF" bold />
        {typeof row.p50 === "number" && (
          <>
            <Row label="Median (p50)" value={fmtCurrency(row.p50)} color={COLORS.indigo} />
            <div className="pt-1 text-[10px] text-muted-foreground">
              80% range: {fmtCurrency(row.p10)} – {fmtCurrency(row.p90)}
            </div>
            {typeof row.probabilityNegative === "number" && row.probabilityNegative > 0 && (
              <div className="text-[10px] text-red-300">
                {(row.probabilityNegative * 100).toFixed(0)}% chance of negative cash
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-foreground/80">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className={`font-mono tabular-nums ${bold ? "font-bold" : ""}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function heatColor(p: number) {
  if (p <= 0) return "rgba(255,255,255,0.04)";
  if (p < 0.1) {
    const a = 0.15 + (p / 0.1) * 0.45;
    return `rgba(250, 204, 21, ${a.toFixed(2)})`; // yellow
  }
  if (p < 0.25) {
    const a = 0.4 + ((p - 0.1) / 0.15) * 0.45;
    return `rgba(249, 115, 22, ${a.toFixed(2)})`; // orange
  }
  if (p < 0.5) {
    const a = 0.55 + ((p - 0.25) / 0.25) * 0.35;
    return `rgba(239, 68, 68, ${a.toFixed(2)})`; // red
  }
  return "rgba(239, 68, 68, 0.95)";
}

export function CashFlowChart({ data, mc, mcRunning }: Props) {
  const [showBars, setShowBars] = useState(true);
  const [showBand, setShowBand] = useState(true);
  const [showRef, setShowRef] = useState(true);

  // Merge MC bands into the chart rows (band ranges as [low, high] tuples for Recharts Area)
  const chartData = useMemo(() => {
    const bandsByMonth = new Map(mc?.bands.map((b) => [b.month, b]));
    return data.map((d) => {
      const b = bandsByMonth.get(d.month);
      return {
        ...d,
        p10: b?.p10,
        p25: b?.p25,
        p50: b?.p50,
        p75: b?.p75,
        p90: b?.p90,
        probabilityNegative: b?.probabilityNegative ?? 0,
        outerBand: b ? [b.p10, b.p90] : undefined,
        innerBand: b ? [b.p25, b.p75] : undefined,
      };
    });
  }, [data, mc]);

  const kpis = useMemo(() => {
    const eoy = data[data.length - 1].cumulativeCash;
    const lowest = data.reduce((m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m), data[0]);
    const netSum = data.reduce((s, d) => s + d.netCash, 0);
    return { eoy, lowest, netSum };
  }, [data]);

  const dangerMonths = data.filter((d) => d.cumulativeCash < 0);

  return (
    <Card className="glass-card border-white/10 bg-card/60 py-0">
      <CardHeader className="space-y-4 border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Projected Cash Position — 12 Month View
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Base case plus Monte Carlo confidence funnel (1,000 simulations)
            </p>
          </div>
          {mcRunning && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Running 1,000 simulations…
            </div>
          )}
          {!mcRunning && mc && (
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {mc.iterations.toLocaleString()} sims · {mc.durationMs}ms
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Kpi
            label="End-of-Year Cash"
            value={kpis.eoy}
            tone={kpis.eoy >= 0 ? "positive" : "negative"}
            icon={kpis.eoy >= 0 ? TrendingUp : TrendingDown}
          />
          <Kpi
            label={`Lowest: ${kpis.lowest.month}`}
            value={kpis.lowest.cumulativeCash}
            tone={kpis.lowest.cumulativeCash < 50000 ? "negative" : "neutral"}
            icon={AlertTriangle}
          />
          <Kpi
            label="Net Cash Flow"
            value={kpis.netSum}
            tone={kpis.netSum >= 0 ? "positive" : "negative"}
            icon={kpis.netSum >= 0 ? TrendingUp : TrendingDown}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="month"
                tick={{ fill: COLORS.muted, fontSize: 11 }}
                tickFormatter={(v) => v.split(" ")[0]}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickFormatter={fmtAxis}
                axisLine={false}
                tickLine={false}
                width={64}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: COLORS.indigo, strokeWidth: 1, strokeDasharray: "3 3", fillOpacity: 0 }}
              />

              {/* Danger-zone column highlights */}
              {dangerMonths.map((m) => (
                <ReferenceArea
                  key={`danger-${m.month}`}
                  x1={m.month}
                  x2={m.month}
                  fill={COLORS.red}
                  fillOpacity={0.1}
                  ifOverflow="extendDomain"
                />
              ))}

              {/* Monte Carlo funnel: outer p10–p90 then inner p25–p75 */}
              {showBand && mc && (
                <>
                  <Area
                    type="monotone"
                    dataKey="outerBand"
                    name="p10–p90 range"
                    stroke="none"
                    fill={COLORS.indigo}
                    fillOpacity={0.08}
                    isAnimationActive
                    animationDuration={600}
                    activeDot={false}
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="innerBand"
                    name="p25–p75 range"
                    stroke="none"
                    fill={COLORS.indigo}
                    fillOpacity={0.2}
                    isAnimationActive
                    animationDuration={600}
                    activeDot={false}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="p50"
                    name="Median (p50)"
                    stroke={COLORS.indigo}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive
                    animationDuration={600}
                  />
                </>
              )}

              {/* Inflow / Outflow bars */}
              {showBars && (
                <>
                  <Bar
                    dataKey="outflow"
                    name="Outflow"
                    fill={COLORS.red}
                    fillOpacity={0.6}
                    barSize={16}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={600}
                  />
                  <Bar
                    dataKey="inflow"
                    name="Inflow"
                    fill={COLORS.emerald}
                    fillOpacity={0.6}
                    barSize={16}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={600}
                  />
                </>
              )}

              {/* Deterministic base case (white) on top */}
              <Area
                type="monotone"
                dataKey="cumulativeCash"
                name="Base case"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                fill="url(#cumulativeFill)"
                dot={{ r: 3.5, fill: "#FFFFFF", stroke: "#0A0F1E", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#FFFFFF", stroke: COLORS.indigo, strokeWidth: 2 }}
                isAnimationActive
                animationDuration={600}
              />

              {/* Break-even reference */}
              {showRef && (
                <ReferenceLine
                  y={0}
                  stroke="rgba(255,255,255,0.3)"
                  strokeDasharray="6 3"
                  label={{
                    value: "Break-even",
                    position: "right",
                    fill: COLORS.muted,
                    fontSize: 10,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Probability heat row */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Probability of Negative Cash Position
            </h4>
            {mc && mc.summary.maxProbabilityNegative > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                Peak: {(mc.summary.maxProbabilityNegative * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <TooltipProvider delayDuration={100}>
            <div className="grid grid-cols-12 gap-1">
              {chartData.map((d) => {
                const p = d.probabilityNegative ?? 0;
                return (
                  <UiTooltip key={d.month}>
                    <TooltipTrigger asChild>
                      <motion.div
                        animate={{ backgroundColor: heatColor(p) }}
                        transition={{ duration: 0.4 }}
                        className="h-6 cursor-default rounded-sm border border-white/5"
                      >
                        <span className="sr-only">
                          {d.month}: {(p * 100).toFixed(0)}% chance of negative cash
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      In {d.month}, there is{" "}
                      <span className="font-mono font-bold">{(p * 100).toFixed(0)}%</span> chance of
                      negative cash
                    </TooltipContent>
                  </UiTooltip>
                );
              })}
            </div>
          </TooltipProvider>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>{chartData[0]?.month.split(" ")[0]}</span>
            <div className="flex items-center gap-1.5">
              <span>Risk:</span>
              <span className="h-2 w-3 rounded-sm" style={{ background: heatColor(0.05) }} />
              <span className="h-2 w-3 rounded-sm" style={{ background: heatColor(0.18) }} />
              <span className="h-2 w-3 rounded-sm" style={{ background: heatColor(0.4) }} />
              <span className="h-2 w-3 rounded-sm" style={{ background: heatColor(0.7) }} />
            </div>
            <span>{chartData[chartData.length - 1]?.month.split(" ")[0]}</span>
          </div>
        </div>

        {/* Footer legend + toggles */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <Swatch color="#FFFFFF">Base case</Swatch>
            <Swatch color={COLORS.indigo}>Median (p50)</Swatch>
            <Swatch color="rgba(99,102,241,0.4)">p25–p75</Swatch>
            <Swatch color="rgba(99,102,241,0.15)">p10–p90</Swatch>
            <Swatch color={COLORS.emerald}>Inflow</Swatch>
            <Swatch color={COLORS.red}>Outflow</Swatch>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <Toggle label="Bars" checked={showBars} onChange={setShowBars} />
            <Toggle label="Band" checked={showBand} onChange={setShowBand} />
            <Toggle label="Break-even" checked={showRef} onChange={setShowRef} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneCls =
    tone === "positive"
      ? "bg-positive/10 border-positive/30 text-positive"
      : tone === "negative"
        ? "bg-negative/10 border-negative/30 text-negative"
        : "bg-white/5 border-white/10 text-foreground";

  return (
    <motion.div
      layout
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${toneCls}`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="font-mono text-base font-semibold leading-tight tabular-nums">
          <AnimatedNumber value={value} format={fmtCurrency} />
        </p>
      </div>
    </motion.div>
  );
}

function Swatch({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        className="h-3.5 w-3.5 rounded-sm border-white/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      />
      {label}
    </label>
  );
}
