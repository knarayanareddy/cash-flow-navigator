import { Clock, Download, Save, Loader2, Check, FolderOpen, Columns, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { UserMenu } from "./UserMenu";

export type SaveState = "idle" | "saving" | "saved";

interface Props {
  scenarioName: string;
  onScenarioNameChange: (v: string) => void;
  onSave: () => void;
  onExport: () => void;
  onOpenScenarios: () => void;
  onToggleCompare: () => void;
  comparing: boolean;
  exporting?: boolean;
  user: User | null;
  saveState: SaveState;
  demoMode?: boolean;
  onToggleDemo?: () => void;
  saveReminder?: boolean;
}

import { DemoModeToggle } from "./DemoModeBanner";

export function TopNav({
  scenarioName,
  onScenarioNameChange,
  onSave,
  onExport,
  onOpenScenarios,
  onToggleCompare,
  comparing,
  exporting = false,
  user,
  saveState,
  demoMode = false,
  onToggleDemo,
  saveReminder = false,
}: Props) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <span className="hidden whitespace-nowrap font-semibold tracking-tight text-foreground sm:inline">
            Cash Flow Time Machine
          </span>
        </div>

        <div className="mx-auto max-w-md flex-1">
          <Input
            value={scenarioName}
            onChange={(e) => onScenarioNameChange(e.target.value)}
            placeholder="Untitled Scenario"
            className="h-9 border-transparent bg-white/[0.04] text-center text-sm font-medium tracking-tight focus-visible:border-primary/40 focus-visible:bg-white/[0.06]"
          />
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Button
              onClick={onOpenScenarios}
              size="sm"
              variant="ghost"
              className="hidden gap-1.5 text-muted-foreground hover:text-foreground sm:flex"
            >
              <FolderOpen className="h-4 w-4" />
              Scenarios
            </Button>
          )}
          {!user && onToggleDemo && (
            <DemoModeToggle enabled={demoMode} onToggle={onToggleDemo} />
          )}
          <Button
            onClick={onSave}
            size="sm"
            disabled={saveState === "saving"}
            title="Save (⌘S)"
            className={`gap-1.5 min-w-[120px] justify-center ${saveReminder ? "animate-save-pulse" : ""}`}
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Scenario
              </>
            )}
          </Button>
          <Button
            onClick={onToggleCompare}
            size="sm"
            variant={comparing ? "default" : "outline"}
            className={`hidden gap-1.5 md:inline-flex ${
              comparing ? "" : "border-white/15 bg-transparent hover:bg-white/5"
            }`}
          >
            {comparing ? <X className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
            {comparing ? "Exit Compare" : "Compare"}
          </Button>
          <Button
            onClick={onExport}
            disabled={exporting}
            size="sm"
            variant="outline"
            className="hidden gap-1.5 border-white/15 bg-transparent hover:bg-white/5 md:inline-flex"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
          {user ? (
            <UserMenu user={user} onOpenScenarios={onOpenScenarios} />
          ) : (
            <div className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-muted-foreground ring-1 ring-white/10 sm:flex">
              ?
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
