import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getQuotaState } from "@/lib/generation-quota";
import { createClient } from "@/lib/supabase/server";

import { BillingClient } from "./billing-client";

function formatTs(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

async function BillingContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, quota] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "stripe_customer_id, subscription_tier, subscription_status, subscription_current_period_end",
      )
      .eq("id", user.id)
      .single(),
    getQuotaState(supabase, user.id),
  ]);

  const hasStripeCustomer = Boolean(profile?.stripe_customer_id);
  const isProActive =
    profile?.subscription_tier === "pro" &&
    (profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing" ||
      profile?.subscription_status === "past_due");

  let subscriptionLabel = "Free plan";
  if (isProActive) {
    subscriptionLabel = "Pro · active";
  } else if (profile?.subscription_tier === "pro") {
    subscriptionLabel = `Pro (${profile.subscription_status ?? "paused"})`;
  }

  const renewalFormatted = formatTs(profile?.subscription_current_period_end ?? null);
  const renewalLabel = isProActive && renewalFormatted
    ? `Subscription period rolls · ${renewalFormatted}`
    : "Free plans use rolling 30‑day generation windows tracked in Contacts.";

  return (
    <div className="space-y-10">
      <div className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-[0_35px_90px_rgba(14,17,52,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">AI usage · this quota window</p>
        <p className="mt-5 text-3xl font-serif text-zinc-900">
          {quota.used}/{quota.limit} generations used
        </p>
        <p className="mt-4 text-base text-zinc-600">
          Free and Pro quotas reset on rolling 30‑day windows keyed to your profile anchor.
        </p>
      </div>

      <BillingClient
        hasStripeCustomer={hasStripeCustomer}
        isProActive={Boolean(isProActive)}
        renewalLabel={renewalLabel}
        subscriptionLabel={subscriptionLabel}
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/settings">
          ← Settings
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.38em] text-amber-900">Billing · data</p>
        <h1 className="mt-4 text-4xl font-serif text-zinc-900">Usage and subscriptions</h1>
        <p className="mt-3 text-base text-zinc-600">Upgrade for higher monthly generation limits.</p>
      </div>

      <Suspense
        fallback={<div className="rounded-[32px] border border-zinc-100 bg-white p-10 text-zinc-500">Loading billing…</div>}
      >
        <BillingContent />
      </Suspense>
    </div>
  );
}
