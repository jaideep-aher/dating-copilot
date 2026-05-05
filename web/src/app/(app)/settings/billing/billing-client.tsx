"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function BillingClient(props: {
  hasStripeCustomer: boolean;
  isProActive: boolean;
  subscriptionLabel: string;
  renewalLabel: string;
}) {
  const searchParams = useSearchParams();
  const banner = searchParams.get("checkout");
  const [loading, setLoading] = useState<null | "checkout" | "portal">(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function checkout() {
    setError(null);
    setLoading("checkout");
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not open checkout.");
      }
      const url = data.url as string | undefined;
      if (!url) throw new Error("No checkout URL.");
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setLoading(null);
    }
  }

  async function portal() {
    setError(null);
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not open billing portal.");
      }
      const url = data.url as string | undefined;
      if (!url) throw new Error("No portal URL.");
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal failed.");
    } finally {
      setLoading(null);
    }
  }

  async function deleteAccount() {
    const ok = window.confirm(
      "This permanently deletes your account and data. Screenshots are removed best-effort. Continue?",
    );
    if (!ok) return;

    setError(null);
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "DELETE MY ACCOUNT" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Deletion failed.");
      }
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner === "success" ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-950">
          Thanks — Stripe is syncing your subscription. Refresh in a few seconds if tier does not yet show Pro.
        </div>
      ) : null}
      {banner === "cancel" ? (
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-zinc-800">
          Checkout canceled. You can subscribe when you&apos;re ready.
        </div>
      ) : null}

      <div className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-[0_35px_90px_rgba(14,17,52,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">Subscription</p>
        <p className="mt-4 text-2xl font-serif text-zinc-900">{props.subscriptionLabel}</p>
        <p className="mt-3 text-base text-zinc-600">{props.renewalLabel}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          {props.isProActive ? (
            <button
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 hover:border-zinc-900 disabled:opacity-50"
              disabled={loading !== null || deleteBusy || !props.hasStripeCustomer}
              onClick={() => void portal()}
              type="button"
            >
              {loading === "portal" ? "Opening…" : "Manage billing"}
            </button>
          ) : (
            <button
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/25 disabled:bg-zinc-400"
              disabled={loading !== null || deleteBusy}
              onClick={() => void checkout()}
              type="button"
            >
              {loading === "checkout" ? "Redirecting…" : "Subscribe to Pro"}
            </button>
          )}
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Pro tiers refresh generation limits server-side once webhooks mirror Stripe.
        </p>
      </div>

      <div className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-white">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">Data export</p>
        <p className="mt-4 text-base text-zinc-700">
          Download contacts, timelines, pinned facts, and generation metadata as JSON (no image bytes).
        </p>
        <a
          className="mt-6 inline-flex rounded-full border border-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-900"
          href="/api/account/export"
        >
          Export JSON
        </a>
      </div>

      <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-900">Delete account</p>
        <p className="mt-4 text-base text-rose-950">
          Removes auth, database rows tied to your user, and stored screenshots under your uploads prefix. This cannot
          be undone.
        </p>
        <button
          className="mt-6 rounded-full bg-rose-700 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:bg-rose-300"
          disabled={deleteBusy || loading !== null}
          onClick={() => void deleteAccount()}
          type="button"
        >
          {deleteBusy ? "Deleting…" : "Delete my account"}
        </button>
      </div>

      {error ? <div className="rounded-3xl bg-rose-50 px-5 py-4 text-sm text-rose-950">{error}</div> : null}
    </div>
  );
}
