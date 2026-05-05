import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function subscriptionPeriodEndIso(sub: Stripe.Subscription): string | null {
  const itemEnds = sub.items?.data?.map((item) => item.current_period_end).filter(Boolean) ?? [];
  if (!itemEnds.length) return null;
  const maxTs = Math.max(...itemEnds);
  return new Date(maxTs * 1000).toISOString();
}

function tierFromStatus(status: Stripe.Subscription.Status): "free" | "pro" {
  if (status === "active" || status === "trialing" || status === "past_due") return "pro";
  return "free";
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: insErr } = await admin.from("stripe_events").insert({ id: event.id });
  if (insErr) {
    const code = (insErr as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "Event log failed" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment" && session.metadata?.checkout_kind === "coach_book") {
          const bookingId = session.metadata.booking_id;
          if (bookingId) {
            await admin
              .from("coach_bookings")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                amount_total_cents: session.amount_total ?? 0,
                currency: typeof session.currency === "string" ? session.currency : "usd",
                stripe_checkout_session_id: session.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", bookingId);
          }
          break;
        }

        if (session.mode !== "subscription") {
          break;
        }

        const userId = session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!userId || !customerId || !subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        await admin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            subscription_tier: tierFromStatus(sub.status),
            subscription_status: sub.status,
            subscription_current_period_end: subscriptionPeriodEndIso(sub),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const metaUserId = sub.metadata?.user_id?.trim();
        const userId = metaUserId && metaUserId.length > 0 ? metaUserId : null;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const status = sub.status;

        const row = {
          stripe_customer_id: customerId,
          stripe_subscription_id: status === "canceled" ? null : sub.id,
          subscription_tier: tierFromStatus(status),
          subscription_status: status,
          subscription_current_period_end:
            status === "canceled" ? null : subscriptionPeriodEndIso(sub),
          updated_at: new Date().toISOString(),
        };

        if (userId) {
          await admin.from("profiles").update(row).eq("id", userId);
        } else {
          await admin.from("profiles").update(row).eq("stripe_subscription_id", sub.id);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
