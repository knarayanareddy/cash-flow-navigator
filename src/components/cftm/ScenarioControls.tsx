import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sliders, RotateCcw, TrendingUp, Users, Megaphone, Calendar, Banknote, UserMinus } from "lucide-react";
import { DEFAULT_LEVERS, type Levers } from "@/lib/mockData";
import { motion } from "framer-motion";

interface Props {
  levers: Levers;
  onChange: (l: Levers) => void;
}

type LeverDef = {
  key: keyof Levers;
  label: string;
  icon: typeof TrendingUp;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint: string;
};

const LEVER_DEFS: LeverDef[] = [
  { key: "revenueGrowth", label: "Revenue Growth", icon: TrendingUp, min: -50, max: 100, step: 1, format: (v) => `${v > 0 ? "+" : ""}${v}%`, hint: "MoM expansion rate" },
  { key: "churnRate", label: "Churn Rate", icon: UserMinus, min: 0, max: 30, step: 0.5, format: (v) => `${v}%`, hint: "Monthly logo churn" },
  { key: "headcountDelta", label: "Headcount Δ", icon: Users, min: -20, max: 30, step: 1, format: (v) => `${v > 0 ? "+" : ""}${v}`, hint: "Net hires this year" },
  { key: "marketingSpend", label: "Marketing Spend", icon: Megaphone, min: -50, max: 200, step: 5, format: (v) => `${v > 0 ? "+" : ""}${v}%`, hint: "vs. baseline budget" },
  { key: "collectionDays", label: "DSO Change", icon: Calendar, min: -30, max: 60, step: 1, format: (v) => `${v > 0 ? "+" : ""}${v}d`, hint: "Days sales outstanding" },
  { key: "fundingInjection", label: "Funding Injection", icon: Banknote, min: 0, max: 2000000, step: 50000, format: (v) => `$${(v / 1000).toFixed(0)}k`, hint: "One-time at month 1" },
];

export function ScenarioControls({ levers, onChange }: Props) {
  const update = <K extends keyof Levers>(k: K, v: Levers[K]) => onChange({ ...levers, [k]: v });
  const activeCount = (Object.keys(DEFAULT_LEVERS) as (keyof Levers)[]).filter(
    (k) => levers[k] !== DEFAULT_LEVERS[k],
  ).length;

  return (
    <Card className="glass-card border-white/10 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold tracking-tight">Scenario Controls</CardTitle>
          {activeCount > 0 && (
            <Badge variant="secondary" className="rounded-full bg-primary/15 text-primary hover:bg-primary/20">
              {activeCount} active
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(DEFAULT_LEVERS)}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {LEVER_DEFS.map((def, i) => {
          const Icon = def.icon;
          const value = levers[def.key];
          const isActive = value !== DEFAULT_LEVERS[def.key];
          return (
            <motion.div
              key={def.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
              className="space-y-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium text-foreground">{def.label}</span>
                </div>
                <span className={`font-mono text-sm tabular-nums ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {def.format(value)}
                </span>
              </div>
              <Slider
                value={[value]}
                min={def.min}
                max={def.max}
                step={def.step}
                onValueChange={([v]) => update(def.key, v)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground/70">{def.hint}</p>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
