import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Admins via `profiles.is_admin` or comma-separated emails in ADMIN_EMAILS. */
export async function isAppAdmin(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user?.email) return false;

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.includes(user.email.toLowerCase())) {
    return true;
  }

  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  return Boolean(data?.is_admin);
}

export function coachPlatformFeeBps(): number {
  const raw = Number(process.env.COACH_PLATFORM_FEE_BPS ?? "1500");
  if (!Number.isFinite(raw) || raw < 0 || raw > 8000) return 1500;
  return Math.floor(raw);
}
