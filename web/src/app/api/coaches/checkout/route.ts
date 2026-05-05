import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { coachPlatformFeeBps } from "@/lib/admin-access";
import { rateLimitOrThrow } from "@/lib/simple-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  coachSlug: z.string().trim().min(1).max(120),
  contextPackId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const siteUrlRaw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const siteUrl = siteUrlRaw.replace(/\/$/, "");

  if (!stripeKey) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    rateLimitOrThrow("api:coach-checkout", user.id);
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message ?? "Too many requests" }, { status: err.status ?? 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { coachSlug, contextPackId } = parsed.data;

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, headline, slug, session_amount_cents, currency, session_price_display, external_booking_url")
    .eq("slug", coachSlug.trim().toLowerCase())
    .eq("is_published", true)
    .not("verified_at", "is", null)
    .maybeSingle();

  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  if ((coach.session_amount_cents ?? 0) <= 0) {
    return NextResponse.json(
      {
        error: "This coach uses scheduling only.",
        fallbackUrl: coach.external_booking_url ?? null,
      },
      { status: 400 },
    );
  }

  let packCoachMatch = true;
  if (contextPackId) {
    const { data: pack } = await supabase
      .from("context_packs")
      .select("id, coach_id, expires_at")
      .eq("id", contextPackId)
      .eq("client_user_id", user.id)
      .maybeSingle();

    if (!pack || new Date(pack.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Context pack invalid or expired" }, { status: 400 });
    }

    if (pack.coach_id && pack.coach_id !== coach.id) {
      packCoachMatch = false;
    }
  }

  if (!packCoachMatch) {
    return NextResponse.json({ error: "Context pack targets a different coach" }, { status: 400 });
  }

  const currency = coach.currency ?? "usd";
  const feeBps = coachPlatformFeeBps();
  const stripe = new Stripe(stripeKey);

  const { data: booking, error: bookErr } = await supabase
    .from("coach_bookings")
    .insert({
      client_user_id: user.id,
      coach_id: coach.id,
      context_pack_id: contextPackId ?? null,
      status: "pending",
      amount_total_cents: coach.session_amount_cents ?? 0,
      platform_fee_bps: feeBps,
      currency,
    })
    .select("id")
    .single();

  if (bookErr || !booking) {
    return NextResponse.json({ error: "Could not start booking" }, { status: 500 });
  }

  const feePercent = feeBps / 100;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: coach.session_amount_cents ?? 0,
            product_data: {
              name: `Coaching · ${coach.headline}`,
              description:
                `${feePercent}% platform service fee is included in this charge; see site terms for settlement details.`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/coach/session-success?booking_id=${booking.id}`,
      cancel_url: `${siteUrl}/coaches/${encodeURIComponent(coach.slug)}?checkout=cancel`,
      metadata: {
        checkout_kind: "coach_book",
        booking_id: booking.id,
        client_user_id: user.id,
        coach_id: coach.id,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "No checkout URL" }, { status: 500 });
    }

    await supabase
      .from("coach_bookings")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return NextResponse.json({ url: session.url, bookingId: booking.id });
  } catch {
    await supabase
      .from("coach_bookings")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    return NextResponse.json({ error: "Stripe session failed" }, { status: 500 });
  }
}
