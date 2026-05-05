"use client";

import { FormEvent, useMemo, useState } from "react";
import type { GenerationPayload } from "@/lib/ai/generate-replies";

type TimelineRow = {
  id: string;
  kind: string;
  snapshot: string;
};

type PinRow = {
  id: string;
  body: string;
};

export function GenerationPanel(props: {
  contactId: string;
  contactName: string;
  timelineItems: TimelineRow[];
  pinnedFacts: PinRow[];
  quotaSummary: { used: number; limit: number };
}) {
  const [selectedTimeline, setSelectedTimeline] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(props.timelineItems.map((row) => [row.id, true])),
  );

  const [selectedPins, setSelectedPins] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(props.pinnedFacts.map((row) => [row.id, true])),
  );

  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<(GenerationPayload & { id?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  const selectedTimelineIds = useMemo(
    () => Object.entries(selectedTimeline).filter(([, v]) => v).map(([k]) => k),
    [selectedTimeline],
  );
  const selectedPinIds = useMemo(
    () => Object.entries(selectedPins).filter(([, v]) => v).map(([k]) => k),
    [selectedPins],
  );

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: props.contactId,
          timelineItemIds: selectedTimelineIds,
          pinnedFactIds: selectedPinIds,
          instruction,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Could not generate replies.");
      }
      const data = await res.json();
      setLastId(data.id as string);
      setPayload({
        id: data.id,
        variants: data.variants,
        cautions: data.cautions,
        next_step: data.next_step,
        explain: data.explain,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(value: 1 | -1) {
    if (!lastId) return;
    await fetch("/api/generations/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lastId, feedback: value }),
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-10 rounded-[40px] border border-zinc-100 bg-gradient-to-b from-white to-zinc-50 p-10 shadow-[0_40px_110px_rgba(10,12,40,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-amber-900">Ask Wingboard</p>
          <h2 className="mt-4 text-4xl font-serif text-zinc-900">Grounded reply options for {props.contactName}</h2>
          <p className="mt-3 text-sm text-zinc-500">
            Monthly generations {props.quotaSummary.used}/{props.quotaSummary.limit} consumed.
          </p>
        </div>
      </div>

      <form className="space-y-8" onSubmit={(ev) => void handleSubmit(ev)}>
        <fieldset className="grid gap-6 md:grid-cols-2">
          <legend className="sr-only">Context selectors</legend>
          <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">Timeline rows</p>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-2 text-sm font-medium text-zinc-800">
              {props.timelineItems.length === 0 ? (
                <p className="text-zinc-500">Add a note or screenshot bundle first.</p>
              ) : (
                props.timelineItems.map((item) => (
                  <label className="flex items-start gap-3" key={item.id}>
                    <input
                      checked={Boolean(selectedTimeline[item.id])}
                      onChange={(ev) =>
                        setSelectedTimeline((prev) => ({
                          ...prev,
                          [item.id]: ev.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      <span className="uppercase text-[0.62rem] tracking-[0.3em] text-zinc-400">{item.kind}</span>
                      <span className="mt-1 block text-[0.92rem]">{item.snapshot}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">Pinned facts</p>
            <div className="mt-4 space-y-3 text-sm text-zinc-800">
              {props.pinnedFacts.length === 0 ? (
                <p className="text-zinc-500">No pins yet — add quick reminders on the left rail.</p>
              ) : (
                props.pinnedFacts.map((fact) => (
                  <label className="flex items-start gap-3" key={fact.id}>
                    <input
                      checked={Boolean(selectedPins[fact.id])}
                      onChange={(ev) =>
                        setSelectedPins((prev) => ({
                          ...prev,
                          [fact.id]: ev.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{fact.body}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </fieldset>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500" htmlFor="instruction">
            Optional nudge
          </label>
          <textarea
            className="mt-3 w-full rounded-3xl border border-zinc-200 px-5 py-4 text-base outline-none ring-amber-900/30 focus:border-amber-700 focus:ring-4"
            id="instruction"
            maxLength={2000}
            onChange={(ev) => setInstruction(ev.target.value)}
            placeholder="Examples: keep it short, she ghosted for two days, ask for Saturday brunch…"
            rows={3}
            value={instruction}
          />
        </div>

        {error ? <div className="rounded-3xl bg-rose-50 px-5 py-4 text-sm text-rose-950">{error}</div> : null}

        <button
          className="w-full rounded-full bg-zinc-900 py-4 text-base font-semibold text-white shadow-xl shadow-black/30 disabled:bg-zinc-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "Building options…" : "Generate contextual replies"}
        </button>
      </form>

      {payload ? (
        <div className="space-y-6 border-t border-dashed border-zinc-200 pt-8">
          <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Variants
          </div>
          <div className="space-y-6">
            {payload.variants.map((variant) => (
              <article
                className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-[0_35px_120px_rgba(9,12,40,0.12)]"
                key={variant.label}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-900">{variant.label}</p>
                  <button
                    className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] hover:border-zinc-400"
                    onClick={() => void copy(variant.text)}
                    type="button"
                  >
                    Copy block
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-zinc-900">{variant.text}</p>
              </article>
            ))}
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-900">Cautions</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base">
              {payload.cautions.map((caution) => (
                <li key={caution}>{caution}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-6 py-5 text-emerald-950">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900">Suggested next move</p>
            <p className="mt-3 text-lg">{payload.next_step}</p>
          </div>
          {payload.explain ? (
            <details className="rounded-3xl bg-white px-6 py-5 shadow-inner shadow-zinc-50">
              <summary className="cursor-pointer text-base font-semibold text-zinc-900">Why these lines?</summary>
              <p className="mt-4 text-base leading-relaxed text-zinc-700">{payload.explain}</p>
            </details>
          ) : null}

          <div className="flex gap-4">
            <button
              className="rounded-full border border-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-900"
              onClick={() => void sendFeedback(1)}
              type="button"
            >
              Helpful 👍
            </button>
            <button
              className="rounded-full border border-rose-400 px-5 py-3 text-sm font-semibold text-rose-900"
              onClick={() => void sendFeedback(-1)}
              type="button"
            >
              Needs work 👎
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
