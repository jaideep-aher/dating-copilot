import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  submitConfirmContactName,
  submitPinnedDelete,
  submitPinnedFactForm,
  submitTimelineDelete,
  submitTimelineNoteForm,
  submitTimelineScreenshotsForm,
} from "@/app/actions/contacts";
import { MAX_PINNED_FACTS } from "@/lib/constants";
import { getQuotaState } from "@/lib/generation-quota";
import { createClient } from "@/lib/supabase/server";
import { GenerationPanel } from "@/components/generation-panel";

type PageProps = { params: Promise<{ id: string }> };

function formatTs(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function ContactDetailPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, display_name, name_confirmed, archived_at, created_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (contactError || !contact) {
    notFound();
  }

  const [{ data: profile }, quota, { data: pinned }, { data: timeline }] = await Promise.all([
    supabase.from("profiles").select("default_tone").eq("id", user.id).single(),
    getQuotaState(supabase, user.id),
    supabase
      .from("pinned_facts")
      .select("id, body, sort_order, created_at")
      .eq("contact_id", contact.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("timeline_items")
      .select("id, kind, note_text, ocr_preview, created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false }),
  ]);

  const timelineRows = timeline ?? [];

  let fileGrouping: Record<string, number> = {};
  const timelineIds = timelineRows.filter((item) => item.kind === "screenshots").map((item) => item.id);
  if (timelineIds.length) {
    const { data: fileLinks } = await supabase.from("timeline_item_files").select("timeline_item_id").in("timeline_item_id", timelineIds);
    fileGrouping =
      fileLinks?.reduce<Record<string, number>>((acc, row) => {
        acc[row.timeline_item_id] = (acc[row.timeline_item_id] ?? 0) + 1;
        return acc;
      }, {}) ?? {};
  }

  const plannerTimeline = [...timelineRows]
    .reverse()
    .map((item) => {
      if (item.kind === "note") {
        return {
          id: item.id,
          kind: item.kind,
          snapshot: item.note_text ? item.note_text.slice(0, 160) : "(empty)",
        };
      }
      const count = fileGrouping[item.id] ?? 0;
      const preview = item.ocr_preview ? ` · preview: ${item.ocr_preview.slice(0, 60)}…` : "";
      return {
        id: item.id,
        kind: item.kind,
        snapshot: `${count} screenshots${preview}`,
      };
    })
    .reverse();

  return (
    <div className="space-y-16">
      <div className="flex flex-wrap items-start justify-between gap-8 border-b border-zinc-100 pb-10">
        <div>
          <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/contacts">
            ← Contacts
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-amber-800">Dossier</p>
          <h1 className="mt-4 text-5xl font-serif text-zinc-900">{contact.display_name}</h1>
          <p className="mt-4 text-sm text-zinc-500">
            Default tone for AI: <span className="font-semibold text-zinc-900">{profile?.default_tone ?? "neutral"}</span>
          </p>
          {contact.archived_at ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.32em] text-amber-900">Archived dossier · read-only vibes</p>
          ) : null}
        </div>
        {!contact.name_confirmed ? (
          <form action={submitConfirmContactName}>
            <input name="contact_id" type="hidden" value={contact.id} />
            <button className="rounded-full bg-amber-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-white hover:bg-black" type="submit">
              Mark name verified
            </button>
          </form>
        ) : (
          <div className="rounded-full bg-emerald-50 px-5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-emerald-800">
            Name anchored
          </div>
        )}
      </div>

      {!contact.name_confirmed ? (
        <div className="rounded-[32px] border border-dashed border-amber-400 bg-gradient-to-br from-white to-amber-50 px-6 py-6 text-sm text-amber-950 shadow-inner shadow-amber-200">
          OCR guesses can be flaky — skim the screenshots one more time before you trust this spelling.
        </div>
      ) : null}

      <div className="rounded-[30px] border border-emerald-100 bg-emerald-50/90 px-6 py-5 text-sm text-emerald-950 shadow-inner shadow-emerald-100">
        <Link className="font-semibold text-emerald-950 underline-offset-4 hover:underline" href={`/contacts/${contact.id}/share-coach`}>
          Build a coach context pack
        </Link>
        <span className="text-emerald-900"> — time-boxed link with only the pins and timeline rows you tick.</span>
      </div>

      <section className="grid gap-10 lg:grid-cols-[0.92fr_minmax(0,1fr)]">
        <div className="space-y-16">
          <div className="space-y-6 rounded-[38px] border border-zinc-100 bg-white p-10 shadow-[0_50px_120px_rgba(10,17,62,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500">Pinned facts ({pinned?.length ?? 0}/{MAX_PINNED_FACTS})</p>
                <p className="mt-4 text-xl text-zinc-700">Facts stay attached on every planner call.</p>
              </div>
            </div>
            <div className="space-y-4">
              {(pinned ?? []).length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 px-6 py-5 text-base text-zinc-500 shadow-inner shadow-zinc-50">
                  Pin logistics, quirks, cues — concise bullets survive best.
                </div>
              ) : (
                (pinned ?? []).map((fact) => (
                  <div className="flex flex-col gap-3 rounded-3xl border border-zinc-100 bg-white p-6 shadow-inner shadow-white/70 md:flex-row md:items-start md:justify-between" key={fact.id}>
                    <p className="text-lg leading-snug text-zinc-900">{fact.body}</p>
                    <form action={submitPinnedDelete}>
                      <input name="contact_id" type="hidden" value={contact.id} />
                      <input name="fact_id" type="hidden" value={fact.id} />
                      <button className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-500 hover:text-rose-700" type="submit">
                        Remove pin
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>

            {(pinned ?? []).length < MAX_PINNED_FACTS ? (
              <form action={submitPinnedFactForm} className="space-y-4 rounded-[28px] border border-zinc-100 bg-zinc-50 p-6">
                <input name="contact_id" type="hidden" value={contact.id} />
                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500" htmlFor="body">
                  New fact
                </label>
                <textarea
                  className="w-full rounded-3xl border border-zinc-200 bg-white px-5 py-4 text-base"
                  id="body"
                  maxLength={500}
                  name="body"
                  placeholder="She works nights · allergic to shellfish · loves vinyl nights"
                  required
                  rows={3}
                />
                <button className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white" type="submit">
                  Pin it
                </button>
              </form>
            ) : null}
          </div>

          <div className="space-y-8 rounded-[38px] border border-zinc-100 bg-white p-10 shadow-[0_40px_120px_rgba(12,16,45,0.08)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500">Timeline</p>
              <p className="mt-5 text-xl text-zinc-700">
                Entries stay scoped strictly to&nbsp;
                <span className="font-semibold">{contact.display_name}</span>.
              </p>
            </div>

            <div className="space-y-6">
              {timelineRows.map((entry) => (
                <article className="space-y-3 rounded-[32px] border border-zinc-100 px-8 py-6 shadow-inner shadow-zinc-50" key={entry.id}>
                  <header className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">
                      {entry.kind === "screenshots" ? "Screenshot bundle" : "Thought note"}
                    </div>
                    <span className="text-xs lowercase text-zinc-400">{formatTs(entry.created_at)}</span>
                  </header>
                  {entry.kind === "screenshots" ? (
                    <>
                      <p className="text-base text-zinc-700">{fileGrouping[entry.id] ?? 0} files stored</p>
                      {entry.ocr_preview ? <p className="text-sm italic text-zinc-500">{entry.ocr_preview}</p> : null}
                    </>
                  ) : (
                    <p className="text-lg leading-snug whitespace-pre-wrap text-zinc-900">{entry.note_text}</p>
                  )}
                  <form action={submitTimelineDelete}>
                    <input name="contact_id" type="hidden" value={contact.id} />
                    <input name="item_id" type="hidden" value={entry.id} />
                    <button className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-500 hover:text-rose-700" type="submit">
                      Delete timeline entry
                    </button>
                  </form>
                </article>
              ))}

              {timelineRows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 px-10 py-8 text-lg text-zinc-500">
                  Populate this canvas with notes about recent dynamics or stitched screenshot batches.
                </div>
              ) : null}
            </div>

            <div className="rounded-[34px] border border-zinc-100 bg-white p-8 shadow-xl shadow-black/15">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500">Drop a quick note</p>
              <form action={submitTimelineNoteForm} className="mt-5 space-y-4">
                <input name="contact_id" type="hidden" value={contact.id} />
                <textarea
                  className="w-full rounded-3xl border border-zinc-200 px-5 py-4 text-base"
                  name="note"
                  placeholder="She suggested wine bar near SoMa — still waiting on day/time."
                  required
                  rows={4}
                />
                <button className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white" type="submit">
                  Save note
                </button>
              </form>
            </div>

            <div className="rounded-[34px] border border-dashed border-zinc-200 bg-zinc-50 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500">Screenshots bundle</p>
              <form action={submitTimelineScreenshotsForm} encType="multipart/form-data" className="mt-5 space-y-4">
                <input name="contact_id" type="hidden" value={contact.id} />
                <input multiple required accept="image/*" className="w-full rounded-3xl bg-white px-4 py-3 text-sm shadow-inner shadow-white" name="files" type="file" />
                <textarea
                  className="w-full rounded-3xl bg-white px-5 py-4 text-base"
                  name="ocr_preview"
                  placeholder="Optional shorthand for your future-you"
                  rows={3}
                />
                <button className="rounded-full border border-zinc-900 px-8 py-3 text-sm font-semibold" type="submit">
                  Attach bundle to timeline
                </button>
              </form>
            </div>
          </div>
        </div>

        <GenerationPanel
          key={`${contact.id}:${[...timelineRows.map((item) => item.id)].sort().join(":")}:${[...(pinned ?? []).map((p) => p.id)].sort().join(":")}`}
          contactId={contact.id}
          contactName={contact.display_name}
          pinnedFacts={(pinned ?? []).map((p) => ({ id: p.id, body: p.body }))}
          quotaSummary={{
            limit: quota.limit,
            used: quota.used,
          }}
          timelineItems={plannerTimeline}
        />
      </section>
    </div>
  );
}
