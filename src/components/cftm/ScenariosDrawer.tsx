import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Star, Trash2, Play, Inbox, Loader2 } from "lucide-react";
import {
  deleteScenario,
  listScenarios,
  relativeTime,
  renameScenario,
  toggleFavorite,
  type ScenarioRow,
} from "@/lib/scenarios";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onLoad: (s: ScenarioRow) => void;
}

export function ScenariosDrawer({ open, onOpenChange, userId, onLoad }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScenarioRow | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setScenarios(await listScenarios());
    } catch (e: any) {
      toast.error("Failed to load scenarios", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) refresh();
  }, [open, userId]);

  // Realtime subscription while open
  useEffect(() => {
    if (!open || !userId) return;
    const channel = supabase
      .channel("scenarios-drawer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scenarios", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, userId]);

  const { favorites, recent } = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = scenarios.filter((s) => {
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    });
    return {
      favorites: filtered.filter((s) => s.is_favorite),
      recent: filtered.filter((s) => !s.is_favorite),
    };
  }, [scenarios, query]);

  const handleRename = async (id: string, name: string) => {
    setEditingId(null);
    try {
      await renameScenario(id, name);
      setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    } catch (e: any) {
      toast.error("Rename failed", { description: e.message });
    }
  };

  const handleFavorite = async (s: ScenarioRow) => {
    const next = !s.is_favorite;
    setScenarios((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_favorite: next } : x)));
    try {
      await toggleFavorite(s.id, next);
    } catch (e: any) {
      toast.error("Couldn't update favorite", { description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deleteScenario(id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      toast.success("Scenario deleted");
    } catch (e: any) {
      toast.error("Delete failed", { description: e.message });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] border-white/10 bg-card/95 p-0 backdrop-blur-xl sm:max-w-[400px]">
          <SheetHeader className="space-y-3 border-b border-white/10 p-5">
            <SheetTitle className="text-base font-semibold tracking-tight">My Scenarios</SheetTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or tag…"
                className="h-9 bg-white/[0.04] pl-8 text-sm"
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 130px)" }}>
            {loading && scenarios.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : scenarios.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-5">
                {favorites.length > 0 && (
                  <Section title="Favorites">
                    <AnimatePresence initial={false}>
                      {favorites.map((s) => (
                        <ScenarioItem
                          key={s.id}
                          scenario={s}
                          editing={editingId === s.id}
                          onStartEdit={() => setEditingId(s.id)}
                          onRename={(name) => handleRename(s.id, name)}
                          onFavorite={() => handleFavorite(s)}
                          onLoad={() => {
                            onLoad(s);
                            onOpenChange(false);
                          }}
                          onDelete={() => setDeleteTarget(s)}
                        />
                      ))}
                    </AnimatePresence>
                  </Section>
                )}
                <Section title={favorites.length > 0 ? "Recent" : "All scenarios"}>
                  <AnimatePresence initial={false}>
                    {recent.map((s) => (
                      <ScenarioItem
                        key={s.id}
                        scenario={s}
                        editing={editingId === s.id}
                        onStartEdit={() => setEditingId(s.id)}
                        onRename={(name) => handleRename(s.id, name)}
                        onFavorite={() => handleFavorite(s)}
                        onLoad={() => {
                          onLoad(s);
                          onOpenChange(false);
                        }}
                        onDelete={() => setDeleteTarget(s)}
                      />
                    ))}
                  </AnimatePresence>
                </Section>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-negative text-white hover:bg-negative/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ScenarioItem({
  scenario,
  editing,
  onStartEdit,
  onRename,
  onFavorite,
  onLoad,
  onDelete,
}: {
  scenario: ScenarioRow;
  editing: boolean;
  onStartEdit: () => void;
  onRename: (name: string) => void;
  onFavorite: () => void;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(scenario.name);
  const result = scenario.calculated_result;
  const eoy = result && result.length > 0 ? result[result.length - 1].cumulativeCash : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="group rounded-md border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => onRename(name.trim() || scenario.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setName(scenario.name);
                  onRename(scenario.name);
                }
              }}
              className="w-full rounded border border-primary/40 bg-background px-1.5 py-0.5 text-sm font-medium text-foreground outline-none"
            />
          ) : (
            <p
              onDoubleClick={onStartEdit}
              className="cursor-text truncate text-sm font-medium text-foreground"
              title="Double-click to rename"
            >
              {scenario.name}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(scenario.updated_at)}</p>
        </div>
        <button
          onClick={onFavorite}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-yellow-400"
          aria-label="Toggle favorite"
        >
          <Star className={`h-3.5 w-3.5 ${scenario.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {eoy !== null && (
          <Badge
            variant="outline"
            className={`rounded-full border font-mono text-[10px] tabular-nums ${
              eoy >= 0
                ? "border-positive/30 bg-positive/10 text-positive"
                : "border-negative/30 bg-negative/10 text-negative"
            }`}
          >
            EOY €{(eoy / 1000).toFixed(0)}k
          </Badge>
        )}
        {scenario.tags.map((t) => (
          <Badge key={t} variant="outline" className="rounded-full border-white/10 bg-white/5 text-[10px]">
            {t}
          </Badge>
        ))}
        {scenario.preset_type && (
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-[10px] text-primary">
            {scenario.preset_type}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="secondary" onClick={onLoad} className="h-7 flex-1 gap-1 text-xs">
          <Play className="h-3 w-3" />
          Load
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-7 gap-1 px-2 text-xs text-negative hover:bg-negative/10 hover:text-negative"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No scenarios yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Adjust the levers and save your first scenario!
      </p>
    </div>
  );
}
