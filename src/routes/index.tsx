import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { TopNav, type SaveState } from "@/components/cftm/TopNav";
import { ScenarioControls } from "@/components/cftm/ScenarioControls";
import { CashFlowChart } from "@/components/cftm/CashFlowChart";
import { CFONarrative } from "@/components/cftm/CFONarrative";
import { StakeholderPanel } from "@/components/cftm/StakeholderPanel";
import { StatusBar } from "@/components/cftm/StatusBar";
import { AuthModal } from "@/components/cftm/AuthModal";
import { ScenariosDrawer } from "@/components/cftm/ScenariosDrawer";
import {
  BASE_DATA,
  DEFAULT_LEVERS,
  calculateCashFlow,
  type Levers,
} from "@/lib/cashflow";
import { upsertScenario, type ScenarioRow } from "@/lib/scenarios";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

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

  const data = useMemo(() => calculateCashFlow(BASE_DATA, levers), [levers]);

  useEffect(() => {
    setLastCalculatedAt(Date.now());
  }, [levers]);

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

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-right" />
      <TopNav
        scenarioName={scenarioName}
        onScenarioNameChange={setScenarioName}
        onSave={save}
        onExport={() => toast("PDF export queued", { description: "Generating boardroom-ready report…" })}
        onOpenScenarios={() => setDrawerOpen(true)}
        user={user}
        saveState={saveState}
      />

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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
      </AnimatePresence>

      <main className="mx-auto max-w-[1400px] px-6 pb-16 pt-24">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <ScenarioControls levers={levers} onChange={setLevers} />
            </div>
          </div>
          <div className="space-y-6 lg:col-span-2">
            <CashFlowChart data={data} />
            <CFONarrative scenarioName={scenarioName} levers={levers} data={data} />
            <StakeholderPanel />
          </div>
        </div>
      </main>

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
