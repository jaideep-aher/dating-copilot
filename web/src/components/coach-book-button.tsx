"use client";

import { useState } from "react";

export function CoachBookButton(props: {
  slug: string;
  amountCents: number;
  contextPackId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/coaches/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachSlug: props.slug,
          contextPackId: props.contextPackId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Checkout unavailable.";
        if (typeof data.fallbackUrl === "string" && data.fallbackUrl.length > 1) {
          window.open(data.fallbackUrl, "_blank", "noopener,noreferrer");
          setError(`${msg} Opened scheduling in another tab when available.`);
          return;
        }
        throw new Error(msg);
      }
      const url = data.url as string | undefined;
      if (!url) throw new Error("No checkout URL returned.");
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not checkout.");
    } finally {
      setLoading(false);
    }
  }

  if (props.amountCents <= 0) return null;

  return (
    <div className="space-y-3">
      <button
        className="w-full rounded-full bg-zinc-900 py-4 text-base font-semibold text-white shadow-lg shadow-black/30 disabled:bg-zinc-400"
        disabled={loading}
        onClick={() => void go()}
        type="button"
      >
        {loading ? "Redirecting…" : "Pay session deposit (Stripe Checkout)"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
