"use client";

import { useState } from "react";

export function SessionSuccessPanel(props: { bookingId: string; paid: boolean; allowRating: boolean }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rated, setRated] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/coach/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: props.bookingId,
          rating: stars,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not save rating.");
      }
      setRated(true);
      setMsg("Thanks — rating saved privately.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!props.paid) {
    return (
      <p className="text-center text-base text-amber-900">
        Stripe is still aligning webhooks. Refresh shortly — once your booking reads Paid in tooling you can drop a rating
        too.
      </p>
    );
  }

  if (rated) {
    return <p className="text-center text-lg text-emerald-900">{msg ?? "Rating saved."}</p>;
  }

  if (!props.allowRating) {
    return (
      <p className="text-center text-lg text-emerald-900">Rating already logged for this session — thank you.</p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-zinc-50">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">Session rating · private</p>
      <label className="block text-lg font-semibold text-zinc-900" htmlFor="stars">
        Stars
      </label>
      <select
        className="w-full rounded-3xl border border-zinc-200 px-5 py-3 text-lg"
        id="stars"
        onChange={(ev) => setStars(Number(ev.target.value))}
        value={stars}
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <textarea
        className="w-full rounded-3xl border border-zinc-200 px-5 py-4 text-base"
        maxLength={4000}
        onChange={(ev) => setComment(ev.target.value)}
        placeholder="Optional note (shared with moderator + coach)"
        rows={4}
        value={comment}
      />
      <button
        className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white disabled:bg-zinc-400"
        disabled={busy}
        onClick={() => void submit()}
        type="button"
      >
        {busy ? "Saving…" : "Submit rating"}
      </button>
      {msg ? <p className="text-sm text-rose-700">{msg}</p> : null}
    </div>
  );
}
