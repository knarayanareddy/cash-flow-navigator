import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  narrative: string;
}

export function NarrativePanel({ narrative }: Props) {
  return (
    <Card className="glass-card border-white/10 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold tracking-tight">CFO Narrative</CardTitle>
        </div>
        <Badge variant="outline" className="rounded-full border-white/15 bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
          AI-generated
        </Badge>
      </CardHeader>
      <CardContent>
        <motion.p
          key={narrative}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm leading-relaxed text-foreground/85"
        >
          {narrative}
        </motion.p>
      </CardContent>
    </Card>
  );
}
