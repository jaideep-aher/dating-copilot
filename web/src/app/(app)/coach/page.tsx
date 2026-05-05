import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { BookingNoteForm } from "./booking-note-form";

export default async function CoachDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: coach } = await supabase.from("coaches").select("id, headline, slug, verified_at").eq("user_id", user.id).maybeSingle();

  if (!coach) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-4xl font-serif text-zinc-900">Coach operations</h1>
        <p className="text-lg text-zinc-600">
          There is no coach profile linked to this login yet. Ask an operator to create a verified{" "}
          <span className="font-mono text-sm">coaches</span> row referencing your Supabase auth id.
        </p>
        <Link className="inline-flex rounded-full border border-zinc-900 px-6 py-3 text-sm font-semibold" href="/coaches">
          Browse public roster
        </Link>
      </div>
    );
  }

  if (!coach.verified_at) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-4xl font-serif text-zinc-900">Verification pending</h1>
        <p className="text-base text-zinc-600">
          Your dossier headline <span className="font-semibold">{coach.headline}</span> is waiting on admin approval before
          it appears publicly.
        </p>
      </div>
    );
  }

  const { data: bookings } = await supabase
    .from("coach_bookings")
    .select("id, status, paid_at, amount_total_cents, currency, context_pack_id, created_at")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-zinc-100 pb-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-amber-900">Coach console</p>
          <h1 className="mt-6 text-4xl font-serif text-zinc-900">{coach.headline}</h1>
          <p className="mt-3 text-base text-zinc-600">
            Public slug&nbsp;
            <Link className="font-mono font-semibold text-zinc-900 underline" href={`/coaches/${encodeURIComponent(coach.slug)}`}>
              /coaches/{coach.slug}
            </Link>
          </p>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-zinc-900">Sessions</h2>
        {!bookings?.length ? (
          <p className="text-base text-zinc-500">No bookings yet.</p>
        ) : (
          <ul className="space-y-6">
            {bookings.map((b) => (
              <li className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-white" key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-zinc-100 pb-4">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">{b.status}</p>
                    <p className="mt-3 font-mono text-sm text-zinc-600">{b.id}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-700">
                    {b.amount_total_cents / 100} {String(b.currency || "usd").toUpperCase()} · Paid{" "}
                    {b.paid_at ? new Date(b.paid_at).toLocaleString() : "—"}
                  </p>
                </div>

                {(b.status === "paid" || b.status === "completed") && (
                  <div className="mt-6">
                    <BookingNoteForm bookingId={b.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
