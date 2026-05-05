import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { SessionSuccessPanel } from "./session-client";

export default async function CoachSessionSuccessPage(props: {
  searchParams?: Promise<{ booking_id?: string }>;
}) {
  const sp = props.searchParams ? await props.searchParams : {};
  const bookingId = typeof sp.booking_id === "string" ? sp.booking_id.trim() : "";

  if (!bookingId) {
    redirect("/contacts");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: booking } = await supabase
    .from("coach_bookings")
    .select("id, status, coach_id")
    .eq("id", bookingId)
    .eq("client_user_id", user.id)
    .maybeSingle();

  if (!booking) {
    redirect("/contacts");
  }

  const paid = booking.status === "paid" || booking.status === "completed";

  let allowRating = false;
  if (paid) {
    const { count } = await supabase
      .from("coach_ratings")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId);
    allowRating = (count ?? 0) === 0;
  }

  const { data: coach } = booking.coach_id
    ? await supabase.from("coaches").select("headline").eq("id", booking.coach_id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-10 text-center">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/contacts">
          ← Contacts
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.36em] text-amber-900">Coaching checkout</p>
        <h1 className="mt-6 text-4xl font-serif text-zinc-900">
          {paid ? "Thanks — payment received" : "Finishing Stripe confirmation"}
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          {coach?.headline ? `Coach · ${coach.headline}` : "Coach session"} booking{" "}
          <span className="font-mono text-sm text-zinc-500">{bookingId}</span>.
        </p>
      </div>

      <SessionSuccessPanel allowRating={allowRating} bookingId={bookingId} paid={paid} />

      <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-zinc-700">
        <Link className="rounded-full border border-zinc-300 px-6 py-3 hover:border-zinc-900" href="/coaches">
          Coach directory
        </Link>
        <Link className="rounded-full bg-zinc-900 px-6 py-3 text-white" href="/contacts">
          Back to dossiers
        </Link>
      </div>
    </div>
  );
}
