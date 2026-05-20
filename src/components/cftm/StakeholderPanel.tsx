import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users } from "lucide-react";

const STAKEHOLDERS = [
  { role: "Board Chair", reaction: "Cautiously supportive — wants a downside drill.", tone: "neutral" },
  { role: "Lead Investor", reaction: "Asking about burn multiple vs. cohort.", tone: "warn" },
  { role: "Head of Sales", reaction: "Pushing back on pipeline assumptions.", tone: "warn" },
  { role: "Engineering", reaction: "Comfortable with current hiring plan.", tone: "good" },
];

export function StakeholderPanel() {
  return (
    <Card className="glass-card border-white/10 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold tracking-tight">Stakeholder Reactions</CardTitle>
        </div>
        <Badge variant="outline" className="gap-1 rounded-full border-white/15 bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
          <Fish className="h-2.5 w-2.5" />
          MiroFish
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {STAKEHOLDERS.map((s) => (
          <div
            key={s.role}
            className="flex items-start justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] p-3 transition-colors duration-300 ease-in-out hover:bg-white/[0.04]"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{s.role}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.reaction}</p>
            </div>
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                s.tone === "good" ? "bg-positive" : s.tone === "warn" ? "bg-yellow-400" : "bg-muted-foreground"
              }`}
            />
          </div>
        ))}
        <p className="pt-1 text-center text-[11px] text-muted-foreground/60">
          Live stakeholder simulation coming soon
        </p>
      </CardContent>
    </Card>
  );
}
