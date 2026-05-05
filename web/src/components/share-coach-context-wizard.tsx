"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CoachOption = { id: string; slug: string; headline: string };

type PinRow = { id: string; body: string };
type TimelineLite = {
  id: string;
  kind: string;
  snapshot: string;
};

export function ShareCoachContextWizard(props: {
  contactId: string;
  contactName: string;
  pins: PinRow[];
  timeline: TimelineLite[];
  coaches: CoachOption[];
}) {
  const [selectedPins, setSelectedPins] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(props.pins.map((p) => [p.id, false])),
  );
  const [selectedTimeline, setSelectedTimeline] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(props.timeline.map((t) => [t.id, false])),
  );
  const [ttlHours, setTtlHours] = useState(168);
  const [coachId, setCoachId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [packId, setPackId] = useState<string | null>(null);

  const ttlOptions = useMemo(() => [24, 72, 168, 336, 720], []);

  const assignedCoach = useMemo(
    () => props.coaches.find((c) => c.id === coachId),
    [props.coaches, coachId],
  );

  const pinIds = useMemo(
    () => Object.entries(selectedPins).filter(([, v]) => v).map(([k]) => k),
    [selectedPins],
  );
  const timelineIds = useMemo(
    () => Object.entries(selectedTimeline).filter(([, v]) => v).map(([k]) => k),
    [selectedTimeline],
  );

  async function submit() {
    setError(null);
    setShareUrl(null);
    setPackId(null);
    setLoading(true);
    try {
      const res = await fetch("/api/context-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: props.contactId,
          coachId: coachId || undefined,
          ttlHours,
          pinnedFactIds: pinIds,
          timelineItemIds: timelineIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create pack.");
      }
      setShareUrl(String(data.shareUrl));
      setPackId(String(data.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something broke.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
  }

  return (
    <div className="space-y-10">
      <p className="text-base leading-relaxed text-zinc-600">
        Pick what a coach sees for <span className="font-semibold">{props.contactName}</span>. The link expires on a timer
        and cannot list other dossiers unless you regenerate it.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <fieldset className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-white">
          <legend className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500">Pinned facts</legend>
          <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-2">
            {props.pins.length === 0 ? (
              <p className="text-sm text-zinc-500">Add pins inside the dossier timeline first.</p>
            ) : (
              props.pins.map((p) => (
                <label className="flex items-start gap-3 text-base text-zinc-900" key={p.id}>
                  <input
                    checked={Boolean(selectedPins[p.id])}
                    onChange={(ev) =>
                      setSelectedPins((prev) => ({
                        ...prev,
                        [p.id]: ev.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{p.body}</span>
                </label>
              ))
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-white">
          <legend className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500">Timeline</legend>
          <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-2">
            {props.timeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No timeline snippets yet.</p>
            ) : (
              props.timeline.map((row) => (
                <label className="flex items-start gap-3 text-sm leading-snug text-zinc-900" key={row.id}>
                  <input
                    checked={Boolean(selectedTimeline[row.id])}
                    onChange={(ev) =>
                      setSelectedTimeline((prev) => ({
                        ...prev,
                        [row.id]: ev.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="mr-3 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">
                      {row.kind}
                    </span>
                    {row.snapshot}
                  </span>
                </label>
              ))
            )}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3 rounded-[28px] border border-zinc-100 bg-zinc-50 p-6">
          <label className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500" htmlFor="ttl">
            Link lifetime
          </label>
          <select
            className="w-full rounded-3xl border border-zinc-200 bg-white px-5 py-3 text-lg"
            id="ttl"
            onChange={(ev) => setTtlHours(Number(ev.target.value))}
            value={ttlHours}
          >
            {ttlOptions.map((h) => (
              <option key={h} value={h}>
                {h} hours
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 rounded-[28px] border border-zinc-100 bg-zinc-50 p-6">
          <label className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500" htmlFor="coach">
            Optional · pre-assign coach
          </label>
          <select
            className="w-full rounded-3xl border border-zinc-200 bg-white px-5 py-3 text-lg"
            id="coach"
            onChange={(ev) => setCoachId(ev.target.value)}
            value={coachId}
          >
            <option value="">Any verified coach</option>
            {props.coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.headline}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="rounded-3xl bg-rose-50 px-5 py-4 text-sm text-rose-950">{error}</div> : null}

      <button
        className="w-full rounded-full bg-zinc-900 py-4 text-base font-semibold text-white shadow-xl shadow-black/25 disabled:bg-zinc-400"
        disabled={loading}
        onClick={() => void submit()}
        type="button"
      >
        {loading ? "Freezing snapshot…" : "Generate share link"}
      </button>

      {shareUrl ? (
        <div className="space-y-4 rounded-[32px] border border-emerald-200 bg-emerald-50 p-8 text-emerald-950">
          <p className="text-xs font-semibold uppercase tracking-[0.32em]">Share once</p>
          <p className="break-all font-mono text-sm">{shareUrl}</p>
          <div className="flex flex-wrap gap-4">
            <button
              className="rounded-full border border-emerald-800 px-6 py-2 text-sm font-semibold"
              onClick={() => copy()}
              type="button"
            >
              Copy link
            </button>
            {assignedCoach && packId ? (
              <Link
                className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold text-white"
                href={`/coaches/${encodeURIComponent(assignedCoach.slug)}?pack=${encodeURIComponent(packId)}`}
              >
                Book {assignedCoach.headline} with pack
              </Link>
            ) : null}
          </div>
          {packId ? (
            <p className="text-sm text-emerald-900">
              Pack id <span className="font-mono">{packId}</span> — attach when paying the coach deposit for automated audit
              alignment.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
