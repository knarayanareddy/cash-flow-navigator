import { motion } from "framer-motion";
import { Film, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  currentLabel: string;
  onTakeControl: () => void;
}

export function DemoModeBanner({ currentLabel, onTakeControl }: Props) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 shadow-xl backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 text-sm">
        <Film className="h-4 w-4 text-fuchsia-300" />
        <span className="text-foreground">
          🎬 Demo Mode — fictional data
          {currentLabel && (
            <span className="ml-2 text-muted-foreground">· {currentLabel}</span>
          )}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={onTakeControl}
          className="h-7 gap-1 text-xs"
        >
          <Pause className="h-3 w-3" />
          Take Control
        </Button>
      </div>
    </motion.div>
  );
}

export function DemoModeToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      onClick={onToggle}
      size="sm"
      variant={enabled ? "default" : "outline"}
      className={`hidden gap-1.5 sm:inline-flex ${
        enabled
          ? "bg-fuchsia-500 hover:bg-fuchsia-500/90"
          : "border-white/15 bg-transparent hover:bg-white/5"
      }`}
    >
      <Film className="h-4 w-4" />
      {enabled ? "Demo On" : "🎬 Demo"}
    </Button>
  );
}
