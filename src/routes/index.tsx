import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { TopNav } from "@/components/cftm/TopNav";
import { ScenarioControls } from "@/components/cftm/ScenarioControls";
import { CashFlowChart } from "@/components/cftm/CashFlowChart";
import { NarrativePanel } from "@/components/cftm/NarrativePanel";
import { StakeholderPanel } from "@/components/cftm/StakeholderPanel";
import { StatusBar } from "@/components/cftm/StatusBar";
import {
  BASE_DATA,
  DEFAULT_LEVERS,
  calculateCashFlow,
  generateNarrative,
  type Levers,
} from "@/lib/cashflow";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [scenarioName, setScenarioName] = useState("");
  const [levers, setLevers] = useState<Levers>(DEFAULT_LEVERS);
  const [lastCalculatedAt, setLastCalculatedAt] = useState(Date.now());
  const [scenariosSaved, setScenariosSaved] = useState(0);

  const data = useMemo(() => calculateCashFlow(BASE_DATA, levers), [levers]);
  const narrative = useMemo(() => generateNarrative(data, levers), [data, levers]);

  useEffect(() => {
    setLastCalculatedAt(Date.now());
  }, [levers]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-right" />
      <TopNav
        scenarioName={scenarioName}
        onScenarioNameChange={setScenarioName}
        onSave={() => {
          setScenariosSaved((c) => c + 1);
          toast.success("Scenario saved", { description: scenarioName || "Untitled Scenario" });
        }}
        onExport={() => toast("PDF export queued", { description: "Generating boardroom-ready report…" })}
      />

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <main className="mx-auto max-w-[1400px] px-6 pb-16 pt-24">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <ScenarioControls levers={levers} onChange={setLevers} />
            </div>
          </div>
          <div className="space-y-6 lg:col-span-2">
            <CashFlowChart data={data} />
            <NarrativePanel narrative={narrative} />
            <StakeholderPanel />
          </div>
        </div>
      </main>

      <StatusBar lastCalculatedAt={lastCalculatedAt} scenariosSaved={scenariosSaved} />
    </div>
  );
}
