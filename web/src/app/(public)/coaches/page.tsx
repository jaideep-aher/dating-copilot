import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CoachesDirectoryPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("coaches")
    .select("slug, headline, specialties, languages, timezone, session_price_display, external_booking_url")
    .order("headline", { ascending: true });

  const coaches = rows ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-6 py-14">
      <div>
        <Link className="text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline" href="/">
          ← Home
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.36em] text-amber-900">Stage · human coaches</p>
        <h1 className="mt-4 text-5xl font-serif text-zinc-900">Coach directory</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">
          Verified coaches use only the links you deliberately share — never your full inbox unless you paste it yourself.
        </p>
      </div>

      {coaches.length === 0 ? (
        <p className="rounded-[32px] border border-zinc-200 bg-white px-8 py-10 text-zinc-600 shadow-inner shadow-zinc-100">
          No coaches live yet. Ask your operator to publish and verify listings in the dashboard.
        </p>
      ) : (
        <ul className="space-y-6">
          {coaches.map((c) => (
            <li key={c.slug}>
              <Link
                className="block rounded-[36px] border border-zinc-100 bg-white p-8 shadow-[0_38px_100px_rgba(12,16,52,0.1)] transition hover:border-amber-200"
                href={`/coaches/${encodeURIComponent(c.slug)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold text-zinc-900">{c.headline}</h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      Timezone · {c.timezone} · from {c.session_price_display}
                    </p>
                    {(c.specialties as string[] | null)?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {(c.specialties as string[]).slice(0, 6).map((s) => (
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800" key={s}>
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                    View bio
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-zinc-500">
        Coaching explores communication skills and intentions —{" "}
        <span className="font-semibold text-zinc-800">not</span> therapy or crisis care.
      </p>
    </div>
  );
}
