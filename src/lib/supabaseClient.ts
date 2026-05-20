// Placeholder Supabase client — not yet connected.
// Replace with real URL/key (or enable Lovable Cloud) when ready.
import { createClient } from "@supabase/supabase-js";

const url = (import.meta as any).env?.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co";
const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "placeholder-anon-key";

export const supabase = createClient(url, key);
