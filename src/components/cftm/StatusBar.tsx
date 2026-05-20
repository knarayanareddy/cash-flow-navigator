import { useEffect, useState } from "react";
import { Activity, Database } from "lucide-react";

interface Props {
  lastCalculatedAt: number;
  scenariosSaved: number;
}

export function StatusBar({ lastCalculatedAt, scenariosSaved }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((now - lastCalculatedAt) / 1000));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-9 items-center justify-between px-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
          </span>
          <Activity className="h-3 w-3" />
          <span>
            Last calculated: <span className="font-mono tabular-nums text-foreground/80">{seconds}s</span> ago
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3" />
          <span>
            Scenarios saved: <span className="font-mono tabular-nums text-foreground/80">{scenariosSaved}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
