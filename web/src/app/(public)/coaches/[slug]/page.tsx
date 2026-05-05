import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { coachPlatformFeeBps } from "@/lib/admin-access";
import { CoachBookButton } from "@/components/coach-book-button";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ pack?: string }> };

export default async function CoachPublicProfilePage(props: Props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();

  const sp = props.searchParams ? await props.searchParams : {};
  const packParsed = typeof sp.pack === "string" ? z.string().uuid().safeParse(sp.pack) : null;
  const contextPackId = packParsed?.success ? packParsed.data : undefined;

  const supabase = await createClient();
  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "slug, headline, bio, specialties, languages, timezone, session_price_display, session_amount_cents, currency, external_booking_url",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!coach) {
    notFound();
  }

  const feePct = coachPlatformFeeBps() / 100;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-14">
      <div>
        <Link className="text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline" href="/coaches">
          ← Coaches
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.36em] text-amber-900">Coach dossier · public</p>
        <h1 className="mt-5 text-5xl font-serif text-zinc-900">{coach.headline}</h1>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Languages · {(coach.languages ?? []).join(", ") || "—"}
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Timezone · {coach.timezone}</p>
      </div>

      <article className="space-y-5 rounded-[38px] border border-zinc-100 bg-white p-10 shadow-[0_42px_120px_rgba(10,17,62,0.08)]">
        <p className="whitespace-pre-wrap text-lg leading-relaxed text-zinc-800">{coach.bio || "Bio coming soon."}</p>

        {(coach.specialties ?? []).length ? (
          <div className="flex flex-wrap gap-2">
            {coach.specialties.map((tag: string) => (
              <span className="rounded-full bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-950" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </article>

      <div className="rounded-[34px] border border-zinc-200 bg-zinc-50 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-600">Pricing</p>
        <p className="mt-4 text-2xl font-semibold text-zinc-900">{coach.session_price_display}</p>
        <p className="mt-3 text-sm text-zinc-600">
          Platform service fee for infrastructure and safety tooling: <span className="font-semibold">{feePct}%</span> of
          the charge (visible on the Stripe receipt description). Funds settle to the operator account in this MVP;
          coach payouts are reconciled operationally.
        </p>
        {coach.external_booking_url ? (
          <a
            className="mt-6 inline-flex rounded-full border border-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-900"
            href={coach.external_booking_url}
            rel="noreferrer"
            target="_blank"
          >
            Open scheduling link
          </a>
        ) : null}
        <div className="mt-8">
          <CoachBookButton
            amountCents={coach.session_amount_cents ?? 0}
            contextPackId={contextPackId}
            slug={coach.slug}
          />
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Human coaching is for skills and reflection — not medical or mental health treatment. If you are in crisis,
        contact local emergency services.
      </p>
    </div>
  );
}
