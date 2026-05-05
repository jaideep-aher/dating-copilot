import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContextPackPayload } from "@/lib/build-context-pack";

type Props = { params: Promise<{ token: string }> };

export default async function CoachSharePackPage(props: Props) {
  const params = await props.params;
  const raw = decodeURIComponent(params.token).trim();

  let payload: ContextPackPayload | null = null;
  let expiresAt: string | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("context_packs")
      .select("payload, expires_at")
      .eq("access_token", raw)
      .maybeSingle();

    if (data?.expires_at) {
      // Expiry is evaluated at request time (not during static render).
      // eslint-disable-next-line react-hooks/purity -- server route time check
      const live = new Date(data.expires_at).getTime() > Date.now();
      if (live) {
        expiresAt = data.expires_at;
        payload = data.payload as ContextPackPayload;
      }
    }
  } catch {
    // misconfigured SERVICE_ROLE leaves payload null → expired view
  }

  if (!payload || !expiresAt) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-2xl font-serif text-zinc-900">This context link expired or is invalid.</p>
        <p className="mt-6 text-base text-zinc-600">
          Ask the member to regenerate a scoped pack inside their Wingboard contact page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-amber-900">Scoped dossier · read only</p>
        <h1 className="mt-6 text-4xl font-serif text-zinc-900">Coach context · {payload.contact.display_name}</h1>
        <p className="mt-4 text-sm text-zinc-500">
          Frozen snapshot generated {payload.generated_at.replace("T", " ").slice(0, 16)} UTC · expires{" "}
          {new Date(expiresAt).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="rounded-[32px] border border-dashed border-amber-400 bg-gradient-to-br from-white to-amber-50 px-7 py-6 text-base text-amber-950 shadow-inner shadow-amber-100">
        {payload.legal.disclaimer}
      </div>

      <section className="rounded-[38px] border border-zinc-100 bg-white p-10 shadow-[0_42px_120px_rgba(10,17,62,0.06)]">
        <h2 className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500">Pinned logistics</h2>
        {(payload.pinned_facts ?? []).length ? (
          <ul className="mt-6 list-disc space-y-3 pl-5 text-lg leading-relaxed text-zinc-900">
            {payload.pinned_facts.map((p) => (
              <li key={p.id}>{p.body}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-base text-zinc-500">No pinned facts bundled.</p>
        )}
      </section>

      <section className="space-y-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500">Timeline excerpts</h2>
        {(payload.timeline ?? []).length ? (
          <div className="space-y-6">
            {(payload.timeline ?? []).map((row) => (
              <article className="rounded-[32px] border border-zinc-100 px-8 py-6 shadow-inner shadow-zinc-50" key={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-zinc-100 pb-3">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">{row.kind}</span>
                  <span className="text-[0.7rem] text-zinc-400">{row.created_at}</span>
                </div>
                <p className="mt-4 text-base leading-relaxed text-zinc-800">{row.summary}</p>
                <details className="mt-6 rounded-[24px] bg-zinc-50 px-6 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                    Expanded context (coach eyes only)
                  </summary>
                  <pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap text-sm text-zinc-700">
                    {row.context_for_coach}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-base text-zinc-500">No timeline rows selected.</p>
        )}
      </section>

      <p className="text-center text-sm text-zinc-500">
        <Link className="font-semibold text-zinc-900 underline underline-offset-4 hover:text-zinc-600" href="/coaches">
          Coach directory
        </Link>
      </p>
    </div>
  );
}
