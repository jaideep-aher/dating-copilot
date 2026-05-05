import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithOpenAI, mockGeneration } from "@/lib/ai/generate-replies";
import { getQuotaState, incrementQuota } from "@/lib/generation-quota";
import { rateLimitOrThrow } from "@/lib/simple-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = z.object({
  contactId: z.string().uuid(),
  timelineItemIds: z.array(z.string().uuid()).default([]),
  pinnedFactIds: z.array(z.string().uuid()).optional().default([]),
  instruction: z.string().max(2000).optional(),
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
    rateLimitOrThrow("api:generate", user.id);
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

  const { contactId, timelineItemIds, pinnedFactIds, instruction } = parsed.data;

  if (timelineItemIds.length === 0 && pinnedFactIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one timeline item and/or pinned fact", code: "context" },
      { status: 400 },
    );
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, display_name, user_id")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { allowed, used, limit, profile } = await getQuotaState(supabase, user.id);
  if (!allowed || profile === null) {
    return NextResponse.json(
      { error: "Monthly generation limit reached", code: "quota", used, limit },
      { status: 429 },
    );
  }

  const { data: profileTone, error: profileError } = await supabase
    .from("profiles")
    .select("default_tone")
    .eq("id", user.id)
    .single();

  if (profileError || !profileTone) {
    return NextResponse.json({ error: "Profile missing" }, { status: 400 });
  }

  let pinRows: { id: string; body: string }[] = [];
  if (pinnedFactIds.length) {
    const { data: pins } = await supabase
      .from("pinned_facts")
      .select("id, body")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .in("id", pinnedFactIds)
      .order("sort_order", { ascending: true });
    pinRows = pins ?? [];
  }

  let items: {
    id: string;
    kind: string;
    note_text: string | null;
    ocr_preview: string | null;
    created_at: string;
  }[] = [];

  if (timelineItemIds.length) {
    const { data } = await supabase
      .from("timeline_items")
      .select("id, kind, note_text, ocr_preview, created_at")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .in("id", timelineItemIds)
      .order("created_at", { ascending: true });
    items = data ?? [];
  }

  const lines: string[] = [];
  lines.push(`Pinned facts:\n${pinRows.map((p) => `- ${p.body}`).join("\n") || "(none selected)"}`);

  const imageParts: { url: string }[] = [];
  const maxImages = 4;

  for (const item of items) {
    if (item.kind === "note") {
      lines.push(`Note (${item.created_at}): ${item.note_text ?? ""}`);
    } else {
      lines.push(
        `Screenshot bundle (${item.created_at}). Preview: ${item.ocr_preview || "n/a"}`,
      );
      const { data: files } = await supabase
        .from("timeline_item_files")
        .select("storage_path")
        .eq("timeline_item_id", item.id)
        .order("sort_order", { ascending: true });

      for (const f of files ?? []) {
        if (imageParts.length >= maxImages) break;
        const { data: signed, error: signError } = await supabase.storage
          .from("timeline-uploads")
          .createSignedUrl(f.storage_path, 600);
        if (!signError && signed?.signedUrl) {
          imageParts.push({ url: signed.signedUrl });
        }
      }
    }
  }

  if (!items.length && timelineItemIds.length) {
    lines.push("(Selected timeline rows were not found.)");
  }
  if (!items.length && pinnedFactIds.length && !timelineItemIds.length) {
    lines.push("(No timeline snippets — advising from pinned facts only.)");
  }

  const contextText = lines.join("\n\n");

  const payload =
    (await generateWithOpenAI({
      contactName: contact.display_name,
      userTone: profileTone.default_tone ?? "neutral",
      instruction,
      contextText,
      imageParts,
    })) ?? mockGeneration();

  const { data: genRow, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      timeline_item_ids: timelineItemIds,
      pinned_fact_ids: pinnedFactIds,
      instruction: instruction ?? null,
      response: payload,
    })
    .select("id")
    .single();

  if (genError || !genRow) {
    return NextResponse.json({ error: "Failed to save generation" }, { status: 500 });
  }

  await incrementQuota(supabase, user.id, used);

  return NextResponse.json({ id: genRow.id, ...payload });
}
