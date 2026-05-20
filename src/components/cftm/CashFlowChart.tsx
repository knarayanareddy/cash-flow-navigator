import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthData } from "@/lib/mockData";

interface Props {
  data: MonthData[];
}

function fmtCurrency(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              <span className="text-foreground/80">{p.name}</span>
            </span>
            <span className="font-mono tabular-nums text-foreground">{fmtCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashFlowChart({ data }: Props) {
  const endCash = data[data.length - 1].cumulativeCash;
  const startCash = data[0].cumulativeCash;
  const delta = endCash - startCash;
  const positive = delta >= 0;

  return (
    <Card className="glass-card border-white/10 bg-card/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight">12-Month Cash Flow Projection</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Cumulative with best / worst case envelope</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">EOY Cash</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-foreground">{fmtCurrency(endCash)}</p>
          </div>
          <Badge
            className={`gap-1 rounded-full border-0 ${
              positive ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
            }`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="font-mono tabular-nums">{positive ? "+" : ""}{fmtCurrency(delta)}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.60 0.21 277)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.60 0.21 277)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWorst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "oklch(0.55 0.02 260)", fontSize: 11 }}
                tickFormatter={(v) => v.split(" ")[0]}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.55 0.02 260)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickFormatter={fmtCurrency}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(0.60 0.21 277)", strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                formatter={(v) => <span className="text-muted-foreground">{v}</span>}
              />
              <ReferenceLine y={0} stroke="oklch(0.65 0.22 25 / 50%)" strokeDasharray="2 4" />
              <Area type="monotone" dataKey="bestCase" name="Best case" stroke="oklch(0.72 0.17 162)" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#gradBest)" />
              <Area type="monotone" dataKey="worstCase" name="Worst case" stroke="oklch(0.65 0.22 25)" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#gradWorst)" />
              <Area type="monotone" dataKey="cumulativeCash" name="Cumulative cash" stroke="oklch(0.60 0.21 277)" strokeWidth={2.5} fill="url(#gradCash)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
