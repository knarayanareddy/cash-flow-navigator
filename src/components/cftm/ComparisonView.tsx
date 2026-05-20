import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save, ArrowRight, TrendingUp, TrendingDown, GitCompare } from "lucide-react";
import { ScenarioControls } from "./ScenarioControls";
import {
  BASE_DATA,
  calculateCashFlow,
  type Levers,
  type MonthData,
} from "@/lib/cashflow";

const COLOR_A = "#6366F1"; // indigo
const COLOR_B = "#F59E0B"; // amber

function fmtShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}€${Math.round(abs / 1000)}k`;
  return `${sign}€${Math.round(abs)}`;
}

function fmtDelta(n: number) {
  if (n === 0) return "±€0";
  const sign = n > 0 ? "+" : "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}€${Math.round(abs / 1000)}k`;
  return `${sign}€${Math.round(abs)}`;
}

function kpis(data: MonthData[]) {
  const end = data[data.length - 1].cumulativeCash;
  const low = data.reduce((m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m), data[0]);
  const inflow = data.reduce((s, d) => s + d.inflow, 0);
  const outflow = data.reduce((s, d) => s + d.outflow, 0);
  return { end, low, net: inflow - outflow };
}

function KpiCompare({
  label,
  a,
  b,
  inverse = false,
}: {
  label: string;
  a: number;
  b: number;
  inverse?: boolean;
}) {
  const delta = b - a;
  const positive = inverse ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? null : positive ? TrendingUp : TrendingDown;
  const color = delta === 0 ? "text-muted-foreground" : positive ? "text-emerald-400" : "text-red-400";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2 text-sm font-semibold">
        <span style={{ color: COLOR_A }}>{fmtShort(a)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span style={{ color: COLOR_B }}>{fmtShort(b)}</span>
      </div>
      <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${color}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {fmtDelta(delta)}
      </div>
    </div>
  );
}

interface Props {
  scenarioA: Levers;
  scenarioB: Levers;
  onChangeB: (l: Levers) => void;
  onExit: () => void;
  onSaveComparison?: () => void;
}

export function ComparisonView({
  scenarioA,
  scenarioB,
  onChangeB,
  onExit,
  onSaveComparison,
}: Props) {
  const dataA = useMemo(() => calculateCashFlow(BASE_DATA, scenarioA), [scenarioA]);
  const dataB = useMemo(() => calculateCashFlow(BASE_DATA, scenarioB), [scenarioB]);

  const merged = useMemo(
    () =>
      dataA.map((a, i) => ({
        month: a.month,
        cashA: a.cumulativeCash,
        cashB: dataB[i].cumulativeCash,
        delta: dataB[i].cumulativeCash - a.cumulativeCash,
      })),
    [dataA, dataB],
  );

  const kA = kpis(dataA);
  const kB = kpis(dataB);

  const totalDelta = kB.end - kA.end;
  const pctDelta = kA.end !== 0 ? (totalDelta / Math.abs(kA.end)) * 100 : 0;

  return (
    <Card className="glass-card border-white/10 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
            <GitCompare className="h-3.5 w-3.5 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold tracking-tight">
            Scenario Comparison
          </CardTitle>
          <Badge
            variant="outline"
            className="rounded-full border-white/15 bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            A vs B
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onSaveComparison && (
            <Button size="sm" variant="outline" onClick={onSaveComparison} className="h-8 gap-1.5 text-xs">
              <Save className="h-3.5 w-3.5" />
              Save Comparison
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onExit} className="h-8 gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            Exit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLOR_A }} />
            <span className="font-medium">Scenario A</span>
            <span className="text-muted-foreground">(locked)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLOR_B }} />
            <span className="font-medium">Scenario B</span>
            <span className="text-muted-foreground">(editable)</span>
          </div>
        </div>

        {/* KPI deltas */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCompare label="End-Year Cash" a={kA.end} b={kB.end} />
          <KpiCompare label="Net Cash Flow" a={kA.net} b={kB.net} />
          <KpiCompare label="Lowest Cash" a={kA.low.cumulativeCash} b={kB.low.cumulativeCash} />
        </div>

        {/* Overlay chart */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            12-Month Cumulative Cash · A vs B
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <ComposedChart data={merged} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtShort(v)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtShort(v)}
                />
                <Line
                  type="monotone"
                  dataKey="cashA"
                  name="Scenario A"
                  stroke={COLOR_A}
                  strokeWidth={2.5}
                  dot={{ fill: COLOR_A, r: 3 }}
                  animationDuration={400}
                />
                <Line
                  type="monotone"
                  dataKey="cashB"
                  name="Scenario B"
                  stroke={COLOR_B}
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ fill: COLOR_B, r: 3 }}
                  animationDuration={400}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Delta row */}
          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Delta (B − A)
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer>
                <BarChart data={merged} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtShort(v)}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,15,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtDelta(v)}
                  />
                  <Bar dataKey="delta" radius={[4, 4, 0, 0]} animationDuration={500}>
                    {merged.map((d, i) => (
                      <Cell key={i} fill={d.delta >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Synthetic comparison line */}
        <motion.div
          key={totalDelta}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-3 text-sm ${
            totalDelta >= 0
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          Scenario B {totalDelta >= 0 ? "improves" : "worsens"} end-year cash by{" "}
          <span className="font-semibold">{fmtDelta(totalDelta)}</span>
          {Number.isFinite(pctDelta) && (
            <>
              {" "}
              (<span className="font-mono">{pctDelta >= 0 ? "+" : ""}{pctDelta.toFixed(1)}%</span>)
            </>
          )}
          {" "}vs Scenario A.
        </motion.div>

        {/* Lever controls for B */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLOR_B }}>
            Adjust Scenario B Levers
          </div>
          <ScenarioControls levers={scenarioB} onChange={onChangeB} />
        </div>
      </CardContent>
    </Card>
  );
}
