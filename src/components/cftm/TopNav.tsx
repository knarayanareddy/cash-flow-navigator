import { Clock, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface Props {
  scenarioName: string;
  onScenarioNameChange: (v: string) => void;
  onSave: () => void;
  onExport: () => void;
}

export function TopNav({ scenarioName, onScenarioNameChange, onSave, onExport }: Props) {
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
          <span className="font-semibold tracking-tight text-foreground whitespace-nowrap">
            Cash Flow Time Machine
          </span>
        </div>

        <div className="flex-1 max-w-md mx-auto">
          <Input
            value={scenarioName}
            onChange={(e) => onScenarioNameChange(e.target.value)}
            placeholder="Untitled Scenario"
            className="h-9 border-transparent bg-white/[0.04] text-center text-sm font-medium tracking-tight focus-visible:border-primary/40 focus-visible:bg-white/[0.06]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onSave} size="sm" className="gap-1.5">
            <Save className="h-4 w-4" />
            Save Scenario
          </Button>
          <Button onClick={onExport} size="sm" variant="outline" className="gap-1.5 border-white/15 bg-transparent hover:bg-white/5">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-semibold text-white ring-2 ring-background">
            CF
          </div>
        </div>
      </div>
    </motion.header>
  );
}
