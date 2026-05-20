import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { TopNav, type SaveState } from "@/components/cftm/TopNav";
import { ScenarioControls } from "@/components/cftm/ScenarioControls";
import { CashFlowChart } from "@/components/cftm/CashFlowChart";
import { CFONarrative } from "@/components/cftm/CFONarrative";
import { StakeholderPanel } from "@/components/cftm/StakeholderPanel";
import { StatusBar } from "@/components/cftm/StatusBar";
import { AuthModal } from "@/components/cftm/AuthModal";
import { ScenariosDrawer } from "@/components/cftm/ScenariosDrawer";
import { DemoModeBanner } from "@/components/cftm/DemoModeBanner";
import { OfflineBanner } from "@/components/cftm/OfflineBanner";
import { BuiltWithBadge } from "@/components/cftm/BuiltWithBadge";
import {
  BASE_DATA,
  DEFAULT_LEVERS,
  calculateCashFlow,
  type Levers,
} from "@/lib/cashflow";
import { upsertScenario, type ScenarioRow } from "@/lib/scenarios";
import { useAuth } from "@/hooks/useAuth";
import { useMonteCarlo } from "@/hooks/useMonteCarlo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Loader2 } from "lucide-react";
import type { NarrativeResult } from "@/lib/narrative.functions";
import type { StakeholderResult } from "@/lib/stakeholders.functions";

// Lazy-load heavy/optional components
const ComparisonView = lazy(() =>
  import("@/components/cftm/ComparisonView").then((m) => ({ default: m.ComparisonView })),
);
const PDFReport = lazy(() =>
  import("@/components/cftm/PDFReport").then((m) => ({ default: m.PDFReport })),
);
type PDFReportData = import("@/components/cftm/PDFReport").PDFReportData;

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const [scenarioName, setScenarioName] = useState("");
  const [levers, setLevers] = useState<Levers>(DEFAULT_LEVERS);
  const [lastCalculatedAt, setLastCalculatedAt] = useState(Date.now());
  const [scenariosSaved, setScenariosSaved] = useState(0);

  const [authOpen, setAuthOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);
  const [pendingSaveAfterAuth, setPendingSaveAfterAuth] = useState(false);
  const [staleBanner, setStaleBanner] = useState(false);

  // Comparison mode
  const [comparing, setComparing] = useState(false);
  const [leversB, setLeversB] = useState<Levers>(DEFAULT_LEVERS);

  // Captured AI results for PDF
  const [narrativeResult, setNarrativeResult] = useState<NarrativeResult | null>(null);
  const [stakeholderResult, setStakeholderResult] = useState<StakeholderResult | null>(null);

  // PDF export
  const [exporting, setExporting] = useState(false);
  const [pdfData, setPdfData] = useState<PDFReportData | null>(null);
  const pdfRootRef = useRef<HTMLDivElement>(null);

  // Demo mode (guests only)
  const [demoMode, setDemoMode] = useState(false);
  const [saveReminder, setSaveReminder] = useState(false);

  const data = useMemo(() => calculateCashFlow(BASE_DATA, levers), [levers]);
  const { result: mc, running: mcRunning } = useMonteCarlo(BASE_DATA, levers, 1000);
  const online = useOnlineStatus();

  // Dynamic page title
  useEffect(() => {
    const name = scenarioName.trim() || "Untitled Scenario";
    document.title = `Cash Flow Time Machine | ${name}`;
  }, [scenarioName]);

  useEffect(() => {
    setLastCalculatedAt(Date.now());
  }, [levers]);

  // Negative-cash toast (one per unique month)
  const lastNegativeMonthRef = useRef<string | null>(null);
  useEffect(() => {
    const first = data.find((d) => d.cumulativeCash < 0);
    const key = first?.month ?? null;
    if (key && key !== lastNegativeMonthRef.current) {
      lastNegativeMonthRef.current = key;
      toast.warning(`⚠️ Cash goes negative in ${key}`);
    } else if (!key) {
      lastNegativeMonthRef.current = null;
    }
  }, [data]);

  // Save-reminder pulse every 30s if dirty
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      const dirty = JSON.stringify(levers) !== lastSavedLevers.current;
      if (dirty) {
        setSaveReminder(true);
        setTimeout(() => setSaveReminder(false), 1800);
      }
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  // ---- Save ----
  const save = useCallback(async () => {
    if (!user) {
      setPendingSaveAfterAuth(true);
      setAuthOpen(true);
      return;
    }
    setSaveState("saving");
    try {
      const row = await upsertScenario(user.id, {
        id: currentScenarioId ?? undefined,
        name: scenarioName.trim() || "Untitled Scenario",
        levers,
        baseData: BASE_DATA,
        result: data,
      });
      setCurrentScenarioId(row.id);
      setScenariosSaved((c) => c + 1);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (e: any) {
      setSaveState("idle");
      toast.error("Save failed", { description: e.message });
    }
  }, [user, currentScenarioId, scenarioName, levers, data]);

  // Auto-save after sign-in if a save was pending
  useEffect(() => {
    if (user && pendingSaveAfterAuth) {
      setPendingSaveAfterAuth(false);
      setAuthOpen(false);
      toast.success("Signed in", { description: "Saving your scenario…" });
      save();
    }
  }, [user, pendingSaveAfterAuth, save]);

  // ---- Debounced autosave (every 30s if dirty + 2s slider quiet) ----
  const leversRef = useRef(levers);
  useEffect(() => { leversRef.current = levers; }, [levers]);
  const dirtyRef = useRef(false);
  const lastSavedLevers = useRef<string>(JSON.stringify(DEFAULT_LEVERS));

  useEffect(() => {
    if (!user) return;
    dirtyRef.current = JSON.stringify(levers) !== lastSavedLevers.current;
  }, [levers, user]);

  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = setInterval(() => {
      if (!dirtyRef.current) return;
      // debounce: only fire if no slider change in last 2s
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!dirtyRef.current) return;
        try {
          const row = await upsertScenario(user.id, {
            id: currentScenarioId ?? undefined,
            name: scenarioName.trim() || "Untitled Scenario",
            levers: leversRef.current,
            baseData: BASE_DATA,
            result: calculateCashFlow(BASE_DATA, leversRef.current),
          });
          setCurrentScenarioId(row.id);
          lastSavedLevers.current = JSON.stringify(leversRef.current);
          dirtyRef.current = false;
        } catch {
          /* silent autosave failure */
        }
      }, 2000);
    }, 30000);
    return () => {
      clearInterval(tick);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [user, currentScenarioId, scenarioName]);

  // ---- Realtime: notify if current scenario edited elsewhere ----
  useEffect(() => {
    if (!user || !currentScenarioId) return;
    const channel = supabase
      .channel(`scenario-${currentScenarioId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scenarios", filter: `id=eq.${currentScenarioId}` },
        (payload) => {
          const updated = payload.new as any;
          // Ignore our own writes
          if (JSON.stringify(updated.levers) !== JSON.stringify(leversRef.current)) {
            setStaleBanner(true);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentScenarioId]);

  const reloadCurrent = async () => {
    if (!currentScenarioId) return;
    const { data: row } = await supabase
      .from("scenarios")
      .select("*")
      .eq("id", currentScenarioId)
      .maybeSingle();
    if (row) {
      setLevers(row.levers as unknown as Levers);
      setScenarioName(row.name);
      lastSavedLevers.current = JSON.stringify(row.levers);
      dirtyRef.current = false;
    }
    setStaleBanner(false);
  };

  const loadScenario = (s: ScenarioRow) => {
    setLevers(s.levers);
    setScenarioName(s.name);
    setCurrentScenarioId(s.id);
    lastSavedLevers.current = JSON.stringify(s.levers);
    dirtyRef.current = false;
    toast.success("Scenario loaded", { description: s.name });
  };

  // ---- Export PDF ----
  const handleExport = useCallback(async () => {
    setExporting(true);
    setPdfData({
      scenarioName: scenarioName || "Untitled Scenario",
      company: (user?.user_metadata as any)?.company || (user?.email ?? "Your Company"),
      levers,
      data,
      mc,
      narrative: narrativeResult,
      stakeholders: stakeholderResult,
    });
    // wait for the off-screen template to render
    await new Promise((r) => setTimeout(r, 250));
    try {
      if (!pdfRootRef.current) throw new Error("PDF template not ready");
      const { exportReportToPdf, buildFilename } = await import("@/lib/pdfExport");
      await exportReportToPdf(pdfRootRef.current, buildFilename(scenarioName));
      toast.success("✅ Report downloaded!");
    } catch (e: any) {
      console.error(e);
      toast.error("Export failed", { description: e?.message ?? "Try again" });
    } finally {
      setExporting(false);
      setTimeout(() => setPdfData(null), 500);
    }
  }, [scenarioName, user, levers, data, mc, narrativeResult, stakeholderResult]);

  // ---- Comparison ----
  const toggleCompare = useCallback(() => {
    setComparing((c) => {
      const next = !c;
      if (next) setLeversB(levers); // start B from current A
      return next;
    });
  }, [levers]);

  const saveComparison = useCallback(async () => {
    if (!user) {
      setPendingSaveAfterAuth(true);
      setAuthOpen(true);
      return;
    }
    try {
      const tag = `compare-${Date.now()}`;
      const baseName = scenarioName.trim() || "Scenario";
      const a = await upsertScenario(user.id, {
        name: `${baseName} (A)`,
        levers,
        baseData: BASE_DATA,
        result: data,
      });
      const b = await upsertScenario(user.id, {
        name: `${baseName} (B)`,
        levers: leversB,
        baseData: BASE_DATA,
        result: calculateCashFlow(BASE_DATA, leversB),
      });
      // tag both via update
      await supabase.from("scenarios").update({ tags: [tag, "A"] }).eq("id", a.id);
      await supabase.from("scenarios").update({ tags: [tag, "B"] }).eq("id", b.id);
      toast.success("Comparison saved", { description: `Linked pair: ${baseName}` });
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message });
    }
  }, [user, scenarioName, levers, leversB, data]);

  // ---- Demo mode auto-cycle (guests only) ----
  useDemoMode({
    enabled: demoMode && !user,
    onScriptedLevers: (l) => setLevers(l),
  });
  const currentDemoLabel = demoMode ? scenarioName || "Auto-cycling…" : "";

  // ---- Keyboard shortcuts ----
  useKeyboardShortcuts({
    onSave: () => { void save(); },
    onReset: () => {
      setLevers(DEFAULT_LEVERS);
      toast.success("Levers reset to defaults");
    },
    onExport: () => { void handleExport(); },
    onEscape: () => {
      setDrawerOpen(false);
      setAuthOpen(false);
      setStaleBanner(false);
    },
  });

  const allDefault = useMemo(
    () => JSON.stringify(levers) === JSON.stringify(DEFAULT_LEVERS),
    [levers],
  );

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-right" />
      <TopNav
        scenarioName={scenarioName}
        onScenarioNameChange={setScenarioName}
        onSave={save}
        onExport={handleExport}
        onOpenScenarios={() => setDrawerOpen(true)}
        onToggleCompare={toggleCompare}
        comparing={comparing}
        exporting={exporting}
        user={user}
        saveState={saveState}
        demoMode={demoMode}
        onToggleDemo={() => setDemoMode((d) => !d)}
        saveReminder={saveReminder}
      />

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>


      <AnimatePresence>
        {staleBanner && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 text-sm">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-foreground">This scenario was updated from another session.</span>
              <Button size="sm" variant="secondary" onClick={reloadCurrent} className="h-7 text-xs">
                Reload
              </Button>
              <button
                onClick={() => setStaleBanner(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
        {exporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-card/80 px-8 py-6 shadow-2xl">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium">📄 Preparing your board report…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-[1400px] px-6 pb-16 pt-24">
        {comparing ? (
          <ComparisonView
            scenarioA={levers}
            scenarioB={leversB}
            onChangeB={setLeversB}
            onExit={() => setComparing(false)}
            onSaveComparison={saveComparison}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <ScenarioControls levers={levers} onChange={setLevers} />
              </div>
            </div>
            <div className="space-y-6 lg:col-span-2">
              <CashFlowChart data={data} mc={mc} mcRunning={mcRunning} />
              <CFONarrative
                scenarioName={scenarioName}
                levers={levers}
                data={data}
                mc={mc}
                onResult={setNarrativeResult}
              />
              <StakeholderPanel
                scenarioName={scenarioName}
                levers={levers}
                data={data}
                mc={mc}
                onResult={setStakeholderResult}
              />
            </div>
          </div>
        )}
      </main>

      {pdfData && <PDFReport ref={pdfRootRef} report={pdfData} />}

      <StatusBar lastCalculatedAt={lastCalculatedAt} scenariosSaved={scenariosSaved} />

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <ScenariosDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        userId={user?.id ?? null}
        onLoad={loadScenario}
      />
    </div>
  );
}
