import type { SupabaseClient } from "@supabase/supabase-js";
import { contextBlockForAi, summarizeTimelinePlannerRow, type TimelinePlannerInput } from "@/lib/timeline-snapshot";

export type ContextPackPayload = {
  version: 1;
  generated_at: string;
  contact: { id: string; display_name: string };
  pinned_facts: { id: string; body: string }[];
  timeline: {
    id: string;
    kind: string;
    created_at: string;
    summary: string;
    context_for_coach: string;
    note_text: string | null;
    debrief_excerpt: Record<string, unknown> | null;
  }[];
  legal: {
    disclaimer: string;
  };
};

const COACHING_DISCLAIMER =
  "This context pack is for coaching about dating skills and communication only. It is not therapy or clinical care. The recipient may not re-share or use it outside the agreed session.";

export async function buildContextPackPayload(
  supabase: SupabaseClient,
  userId: string,
  input: {
    contactId: string;
    pinnedFactIds: string[];
    timelineItemIds: string[];
  },
): Promise<{ payload: ContextPackPayload; contactName: string } | null> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, display_name")
    .eq("id", input.contactId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!contact) return null;

  let pins: { id: string; body: string }[] = [];
  if (input.pinnedFactIds.length) {
    const { data } = await supabase
      .from("pinned_facts")
      .select("id, body")
      .eq("contact_id", input.contactId)
      .eq("user_id", userId)
      .in("id", input.pinnedFactIds)
      .order("sort_order", { ascending: true });
    pins = data ?? [];
  }

  let items: TimelinePlannerInput[] = [];
  if (input.timelineItemIds.length) {
    const { data: rawItems } = await supabase
      .from("timeline_items")
      .select("id, kind, note_text, ocr_preview, payload, created_at")
      .eq("contact_id", input.contactId)
      .eq("user_id", userId)
      .in("id", input.timelineItemIds)
      .order("created_at", { ascending: true });

    const shotIds = (rawItems ?? []).filter((i) => i.kind === "screenshots").map((i) => i.id);
    let fileGrouping: Record<string, number> = {};
    if (shotIds.length) {
      const { data: links } = await supabase
        .from("timeline_item_files")
        .select("timeline_item_id")
        .in("timeline_item_id", shotIds);
      fileGrouping =
        links?.reduce<Record<string, number>>((acc, row) => {
          acc[row.timeline_item_id] = (acc[row.timeline_item_id] ?? 0) + 1;
          return acc;
        }, {}) ?? {};
    }

    items =
      rawItems?.map((row) => ({
        ...row,
        payload: row.payload as Record<string, unknown> | null,
        screenshotsCount: fileGrouping[row.id],
      })) ?? [];
  }

  const timeline = items.map((row) => {
    let debriefExcerpt: Record<string, unknown> | null = null;
    if (row.kind === "debrief" && row.payload?.draft && typeof row.payload.draft === "object") {
      debriefExcerpt = row.payload.draft as Record<string, unknown>;
    }
    return {
      id: row.id,
      kind: row.kind,
      created_at: row.created_at,
      summary: summarizeTimelinePlannerRow(row),
      context_for_coach: contextBlockForAi(row).slice(0, 8000),
      note_text: row.note_text ?? null,
      debrief_excerpt: debriefExcerpt,
    };
  });

  const payload: ContextPackPayload = {
    version: 1,
    generated_at: new Date().toISOString(),
    contact: { id: contact.id, display_name: contact.display_name },
    pinned_facts: pins,
    timeline,
    legal: { disclaimer: COACHING_DISCLAIMER },
  };

  return { payload, contactName: contact.display_name };
}
