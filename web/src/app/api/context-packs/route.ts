import { NextResponse } from "next/server";
import { z } from "zod";
import { buildContextPackPayload } from "@/lib/build-context-pack";
import { rateLimitOrThrow } from "@/lib/simple-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const postSchema = z.object({
  contactId: z.string().uuid(),
  coachId: z.string().uuid().optional().nullable(),
  ttlHours: z.number().int().min(1).max(720).optional().default(168),
  pinnedFactIds: z.array(z.string().uuid()).default([]),
  timelineItemIds: z.array(z.string().uuid()).default([]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    rateLimitOrThrow("api:context-packs", user.id);
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

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const body = parsed.data;
  if (body.pinnedFactIds.length === 0 && body.timelineItemIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one pinned fact or timeline entry" },
      { status: 400 },
    );
  }

  if (body.coachId) {
    const { data: coachOk } = await supabase
      .from("coaches")
      .select("id")
      .eq("id", body.coachId)
      .not("verified_at", "is", null)
      .eq("is_published", true)
      .maybeSingle();

    if (!coachOk) {
      return NextResponse.json({ error: "Coach not found or not accepting packs" }, { status: 400 });
    }
  }

  const built = await buildContextPackPayload(supabase, user.id, {
    contactId: body.contactId,
    pinnedFactIds: body.pinnedFactIds,
    timelineItemIds: body.timelineItemIds,
  });

  if (!built) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const ttlMs = body.ttlHours * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const { data: row, error } = await supabase
    .from("context_packs")
    .insert({
      client_user_id: user.id,
      coach_id: body.coachId ?? null,
      contact_id: body.contactId,
      ttl_hours: body.ttlHours,
      expires_at: expiresAt,
      payload: built.payload,
    })
    .select("id, access_token")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Could not create context pack" }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return NextResponse.json({
    id: row.id,
    accessToken: row.access_token,
    shareUrl: `${siteUrl}/share/coach/${row.access_token}`,
    expiresAt,
    contactName: built.contactName,
  });
}
