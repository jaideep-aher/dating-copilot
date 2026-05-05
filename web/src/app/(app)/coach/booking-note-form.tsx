"use client";

import { useState } from "react";

export function BookingNoteForm({ bookingId }: { bookingId: string }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const lines = draft.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 40);
    if (!lines.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/coach/bookings/${bookingId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homework: lines }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not save.");
      }
      setDraft("");
      setMsg(`Saved (${data.id?.slice?.(0, 8) ?? "ok"}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500" htmlFor={`hw-${bookingId}`}>
        Homework bullets · one line each
      </label>
      <textarea
        className="w-full rounded-[22px] border border-zinc-200 bg-white px-4 py-3 text-base"
        id={`hw-${bookingId}`}
        onChange={(ev) => setDraft(ev.target.value)}
        placeholder="Try a softer check-in on Thursday…&#10;Name the boundary plainly without accusation."
        rows={4}
        value={draft}
      />
      <button
        className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white disabled:bg-zinc-400"
        disabled={busy || !draft.trim()}
        onClick={() => void submit()}
        type="button"
      >
        {busy ? "Saving…" : "Publish notes"}
      </button>
      {msg ? <p className="text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
