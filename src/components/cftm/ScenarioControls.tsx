import { useCallback, useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DEFAULT_LEVERS,
  PRESETS,
  type Levers,
} from "@/lib/cashflow";

interface Props {
  levers: Levers;
  onChange: (l: Levers) => void;
}

type Tone = "good" | "warn" | "bad" | "alert";
const TONE_CLS: Record<Tone, string> = {
  good: "bg-positive/15 text-positive border-positive/30",
  warn: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  alert: "bg-orange-400/15 text-orange-300 border-orange-400/30",
  bad: "bg-negative/15 text-negative border-negative/30",
};

function PulseBadge({ value, tone, children }: { value: string | number | boolean; tone: Tone; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={String(value)}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <Badge variant="outline" className={`rounded-full border font-mono text-xs tabular-nums ${TONE_CLS[tone]}`}>
          {children}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
}

function LeverShell({
  emoji,
  label,
  description,
  badge,
  children,
}: {
  emoji: string;
  label: string;
  description: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-white/5 bg-white/[0.02] py-0 shadow-none transition-colors hover:bg-white/[0.04]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span aria-hidden className="text-base leading-none">{emoji}</span>
              {label}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
          </div>
          <div className="shrink-0">{badge}</div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function ScenarioControls({ levers, onChange }: Props) {
  const update = useCallback(
    <K extends keyof Levers>(k: K, v: Levers[K]) => onChange({ ...levers, [k]: v }),
    [levers, onChange],
  );

  // Track levers via ref so the animation callback always reads latest values.
  const leversRef = useRef(levers);
  useEffect(() => {
    leversRef.current = levers;
  }, [levers]);

  const applyPreset = useCallback((target: Levers) => {
    const numericKeys: (keyof Levers)[] = [
      "paymentDelay",
      "newHires",
      "supplierIncrease",
      "revenueShift",
      "creditLineAmount",
      "fxShift",
      "churnRate",
    ];

    // Snapshot starting state
    const start = { ...leversRef.current };
    const controls = numericKeys.map((k) => {
      const from = start[k] as number;
      const to = target[k] as number;
      return animate(from, to, {
        duration: 0.6,
        ease: "easeInOut",
        onUpdate: (v) => {
          leversRef.current = { ...leversRef.current, [k]: k === "churnRate" ? Math.round(v * 2) / 2 : Math.round(v) };
          onChange({ ...leversRef.current });
        },
      });
    });

    // Toggle creditLineOn at the start so the sub-slider can animate.
    if (target.creditLineOn !== start.creditLineOn) {
      leversRef.current = { ...leversRef.current, creditLineOn: target.creditLineOn };
      onChange({ ...leversRef.current });
    }

    return () => controls.forEach((c) => c.stop());
  }, [onChange]);

  const activeCount = (Object.keys(DEFAULT_LEVERS) as (keyof Levers)[]).filter(
    (k) => levers[k] !== DEFAULT_LEVERS[k],
  ).length;

  return (
    <Card className="glass-card border-white/10 bg-card/60 py-0">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              What-If Levers
              {activeCount > 0 && (
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                  {activeCount}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Adjust variables to simulate cash flow scenarios
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-negative hover:bg-negative/10 hover:text-negative"
          onClick={() => onChange(DEFAULT_LEVERS)}
        >
          <RotateCcw className="h-3 w-3" />
          Reset All
        </Button>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* 1. Payment Delay */}
        <LeverShell
          emoji="💸"
          label="Client Payment Delay"
          description="Days your top client delays their invoice payment"
          badge={
            <PulseBadge
              value={levers.paymentDelay}
              tone={levers.paymentDelay >= 60 ? "bad" : levers.paymentDelay >= 30 ? "warn" : "good"}
            >
              {levers.paymentDelay} days
            </PulseBadge>
          }
        >
          <Slider value={[levers.paymentDelay]} min={0} max={90} step={5} onValueChange={([v]) => update("paymentDelay", v)} />
        </LeverShell>

        {/* 2. New Hires */}
        <LeverShell
          emoji="👥"
          label="New Hires (Q3)"
          description="Additional headcount added in Q3 (avg €6,500/mo each)"
          badge={
            <PulseBadge
              value={levers.newHires}
              tone={levers.newHires >= 13 ? "bad" : levers.newHires >= 6 ? "warn" : "good"}
            >
              {levers.newHires} people
            </PulseBadge>
          }
        >
          <Slider value={[levers.newHires]} min={0} max={20} step={1} onValueChange={([v]) => update("newHires", v)} />
        </LeverShell>

        {/* 3. Supplier */}
        <LeverShell
          emoji="📦"
          label="Supplier Cost Increase"
          description="% increase in supplier and vendor costs across the board"
          badge={
            <PulseBadge
              value={levers.supplierIncrease}
              tone={levers.supplierIncrease >= 20 ? "bad" : levers.supplierIncrease >= 10 ? "warn" : "good"}
            >
              +{levers.supplierIncrease}%
            </PulseBadge>
          }
        >
          <Slider value={[levers.supplierIncrease]} min={0} max={30} step={1} onValueChange={([v]) => update("supplierIncrease", v)} />
        </LeverShell>

        {/* 4. Revenue */}
        <LeverShell
          emoji="📉"
          label="Revenue Scenario"
          description="Simulate a revenue contraction scenario"
          badge={
            <PulseBadge
              value={levers.revenueShift}
              tone={levers.revenueShift <= -20 ? "bad" : levers.revenueShift <= -10 ? "warn" : "good"}
            >
              {levers.revenueShift > 0 ? "+" : ""}{levers.revenueShift}%
            </PulseBadge>
          }
        >
          <Slider value={[levers.revenueShift]} min={-40} max={20} step={2} onValueChange={([v]) => update("revenueShift", v)} />
        </LeverShell>

        {/* 5. Credit Line */}
        <LeverShell
          emoji="🏦"
          label="Activate Credit Line"
          description="Add a revolving credit buffer to your cash position"
          badge={
            levers.creditLineOn ? (
              <PulseBadge value={levers.creditLineAmount} tone="good">
                €{(levers.creditLineAmount / 1000).toFixed(0)}k buffer
              </PulseBadge>
            ) : (
              <PulseBadge value="off" tone="bad">OFF</PulseBadge>
            )
          }
        >
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted-foreground">Credit line</span>
            <Switch
              checked={levers.creditLineOn}
              onCheckedChange={(v) => update("creditLineOn", v)}
            />
          </div>
          <AnimatePresence initial={false}>
            {levers.creditLineOn && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Buffer amount</span>
                    <span className="font-mono tabular-nums text-foreground">
                      €{levers.creditLineAmount.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[levers.creditLineAmount]}
                    min={50000}
                    max={500000}
                    step={25000}
                    onValueChange={([v]) => update("creditLineAmount", v)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LeverShell>

        {/* 6. FX */}
        <LeverShell
          emoji="🌍"
          label="FX Rate Shift"
          description="Currency fluctuation impact on international revenue"
          badge={
            <PulseBadge
              value={levers.fxShift}
              tone={Math.abs(levers.fxShift) >= 15 ? "alert" : Math.abs(levers.fxShift) >= 10 ? "warn" : "good"}
            >
              {levers.fxShift > 0 ? "+" : ""}{levers.fxShift}%
            </PulseBadge>
          }
        >
          <Slider value={[levers.fxShift]} min={-20} max={20} step={1} onValueChange={([v]) => update("fxShift", v)} />
        </LeverShell>

        {/* 7. Churn */}
        <LeverShell
          emoji="🔄"
          label="Customer Churn Rate"
          description="Monthly increase in customer churn (%)"
          badge={
            <PulseBadge
              value={levers.churnRate}
              tone={levers.churnRate >= 8 ? "bad" : levers.churnRate > 3 ? "warn" : "good"}
            >
              {levers.churnRate}%/mo
            </PulseBadge>
          }
        >
          <Slider value={[levers.churnRate]} min={0} max={15} step={0.5} onValueChange={([v]) => update("churnRate", v)} />
        </LeverShell>

        {/* Presets */}
        <div className="pt-2">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario Presets
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(p.levers)}
                className="h-auto flex-col gap-1 border-white/10 bg-white/[0.02] py-2.5 hover:border-primary/40 hover:bg-primary/10"
              >
                <span className="text-lg leading-none">{p.emoji}</span>
                <span className="text-[11px] font-medium">{p.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
