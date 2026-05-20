import { supabase } from "@/integrations/supabase/client";
import type { Levers, MonthData } from "@/lib/cashflow";

export interface ScenarioRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  levers: Levers;
  base_data: MonthData[] | null;
  calculated_result: MonthData[] | null;
  preset_type: string | null;
  is_favorite: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SavePayload {
  id?: string;
  name: string;
  levers: Levers;
  baseData: MonthData[];
  result: MonthData[];
  presetType?: string | null;
}

export async function upsertScenario(userId: string, p: SavePayload): Promise<ScenarioRow> {
  if (p.id) {
    const { data, error } = await supabase
      .from("scenarios")
      .update({
        name: p.name,
        levers: p.levers as any,
        base_data: p.baseData as any,
        calculated_result: p.result as any,
        preset_type: p.presetType ?? null,
      })
      .eq("id", p.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ScenarioRow;
  }
  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      user_id: userId,
      name: p.name,
      levers: p.levers as any,
      base_data: p.baseData as any,
      calculated_result: p.result as any,
      preset_type: p.presetType ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ScenarioRow;
}

export async function listScenarios(): Promise<ScenarioRow[]> {
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ScenarioRow[];
}

export async function deleteScenario(id: string) {
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) throw error;
}

export async function renameScenario(id: string, name: string) {
  const { error } = await supabase.from("scenarios").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function toggleFavorite(id: string, value: boolean) {
  const { error } = await supabase.from("scenarios").update({ is_favorite: value }).eq("id", id);
  if (error) throw error;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
