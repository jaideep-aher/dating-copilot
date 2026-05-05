import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { summarizeTimelinePlannerRow, type TimelinePlannerInput } from "@/lib/timeline-snapshot";

const bodySchema = z.object({
  contactId: z.string().uuid(),
  timelineItemIds: z.array(z.string().uuid()).optional(),
  includePins: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { contactId, timelineItemIds, includePins } = parsed.data;

  const { data: contact } = await supabase
    .from("contacts")
    .select("display_name, created_at")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  let itemsQuery = supabase
    .from("timeline_items")
    .select("id, kind, note_text, ocr_preview, payload, created_at")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (timelineItemIds?.length) {
    itemsQuery = itemsQuery.in("id", timelineItemIds);
  }

  const { data: rawItems } = await itemsQuery;
  const items = rawItems ?? [];

  const shotIds = items.filter((i) => i.kind === "screenshots").map((i) => i.id);
  let fileGrouping: Record<string, number> = {};
  if (shotIds.length) {
    const { data: links } = await supabase.from("timeline_item_files").select("timeline_item_id").in("timeline_item_id", shotIds);
    fileGrouping =
      links?.reduce<Record<string, number>>((acc, row) => {
        acc[row.timeline_item_id] = (acc[row.timeline_item_id] ?? 0) + 1;
        return acc;
      }, {}) ?? {};
  }

  const lines: string[] = [`# Export: ${contact.display_name}`, `Generated: ${new Date().toISOString()}`, "", "## Timeline"];
  for (const row of items) {
    const input: TimelinePlannerInput = {
      ...row,
      payload: row.payload as Record<string, unknown> | null,
      screenshotsCount: fileGrouping[row.id],
    };
    lines.push("");
    lines.push(`### ${row.kind} · ${row.created_at}`);
    lines.push(summarizeTimelinePlannerRow(input));
    if (row.note_text && row.kind !== "note") {
      lines.push(`Note: ${row.note_text}`);
    }
    if (row.kind === "note" && row.note_text) {
      lines.push(row.note_text);
    }
    if (row.kind === "debrief" && row.payload && typeof row.payload === "object" && row.payload !== null) {
      const p = row.payload as { ai?: unknown };
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(p, null, 2).slice(0, 16000));
      lines.push("```");
    }
  }

  let pinsMarkdown = "";
  if (includePins) {
    const { data: pins } = await supabase
      .from("pinned_facts")
      .select("body")
      .eq("contact_id", contactId)
      .order("sort_order", { ascending: true });
    pinsMarkdown = `\n\n## Pinned facts\n${(pins ?? []).map((p) => `- ${p.body}`).join("\n") || "(none)"}`;
  }

  const md = lines.join("\n") + pinsMarkdown + "\n";
  const slug = contact.display_name.replace(/[^\w.-]+/g, "_").slice(0, 40);

  return new NextResponse(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-wingboard-export.md"`,
    },
  });
}
