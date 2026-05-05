import {
  generationLimitForProfile,
  MONTH_MS,
  type QuotaProfile,
} from "@/lib/entitlements";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { QuotaProfile };
export { MONTH_MS, generationLimitForProfile };

export async function getQuotaState(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number; profile: QuotaProfile | null }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("generations_used, generation_period_start, subscription_tier, subscription_status")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { allowed: false, used: 0, limit: 0, profile: null };
  }

  let used = profile.generations_used as number;
  const periodStart = new Date(profile.generation_period_start).getTime();

  if (Date.now() - periodStart > MONTH_MS) {
    used = 0;
    await supabase
      .from("profiles")
      .update({
        generations_used: 0,
        generation_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    profile.generations_used = 0;
    profile.generation_period_start = new Date().toISOString();
  }

  const limit = generationLimitForProfile(profile as QuotaProfile);
  const allowed = used < limit;
  return { allowed, used, limit, profile: profile as QuotaProfile };
}

export async function incrementQuota(supabase: SupabaseClient, userId: string, currentUsed: number): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      generations_used: currentUsed + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
