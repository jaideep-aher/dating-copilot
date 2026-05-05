import { NextResponse } from "next/server";
import { z } from "zod";
import { mockDebrief, debriefWithOpenAI, debriefDraftSchema } from "@/lib/ai/debrief";
import { getQuotaState, incrementQuota } from "@/lib/generation-quota";
import { rateLimitOrThrow } from "@/lib/simple-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = z.object({
  contactId: z.string().uuid(),
  draft: debriefDraftSchema,
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
    rateLimitOrThrow("api:debrief", user.id);
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

  const { contactId, draft } = parsed.data;

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, display_name")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { allowed, used, limit, profile } = await getQuotaState(supabase, user.id);
  if (!allowed || profile === null) {
    return NextResponse.json(
      { error: "Monthly generation limit reached", code: "quota", used, limit },
      { status: 429 },
    );
  }

  const { data: prefs } = await supabase.from("profiles").select("default_tone").eq("id", user.id).single();

  const aiPayload = (await debriefWithOpenAI({
    contactName: contact.display_name,
    userTone: prefs?.default_tone ?? "neutral",
    draft,
  })) ?? mockDebrief();

  const noteText = `Debrief · mood ${draft.mood_1_5}/5 · ${draft.what_next}`;

  const { data: inserted, error: insertErr } = await supabase
    .from("timeline_items")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      kind: "debrief",
      note_text: noteText,
      payload: { draft, ai: aiPayload },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "Failed to save debrief" }, { status: 500 });
  }

  await incrementQuota(supabase, user.id, used);

  return NextResponse.json({ timelineItemId: inserted.id, ...aiPayload });
}
