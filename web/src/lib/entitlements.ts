/** Server-side monetization knobs (Stripe tier + env fallbacks). */

export type SubscriptionTier = "free" | "pro";

export type QuotaProfile = {
  generations_used: number;
  generation_period_start: string;
  subscription_tier?: SubscriptionTier | null;
  subscription_status?: string | null;
};

/** @deprecated use QuotaProfile */
export type ProfileEntitlementsInput = QuotaProfile;

/** Public default for anon bundle; overridden by NEXT_PUBLIC_* in browser if needed elsewhere. */
export const FREE_GENERATIONS_PER_MONTH = Number(
  process.env.NEXT_PUBLIC_FREE_GENERATIONS_PER_MONTH ?? 20,
);

export const PRO_GENERATIONS_PER_MONTH = Number(process.env.PRO_MONTHLY_GENERATIONS ?? 600);

/** Max active (non-archived) contacts while on free tier. */
export const FREE_MAX_CONTACTS = Number(process.env.FREE_MAX_CONTACTS ?? 8);

export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function activeProSubscription(profile: QuotaProfile): boolean {
  if (profile.subscription_tier !== "pro") return false;
  const s = profile.subscription_status;
  return s === "active" || s === "trialing" || s === "past_due";
}

/** Pro subscribers get higher quota when subscription is in good standing. */
export function generationLimitForProfile(profile: QuotaProfile): number {
  if (activeProSubscription(profile)) {
    return PRO_GENERATIONS_PER_MONTH;
  }
  return FREE_GENERATIONS_PER_MONTH;
}

export function maxContactsForProfile(profile: QuotaProfile): number | null {
  if (activeProSubscription(profile)) return null;
  return FREE_MAX_CONTACTS;
}

export function isProTier(profile: QuotaProfile): boolean {
  return activeProSubscription(profile);
}
