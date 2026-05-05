import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * JSON export of metadata the user owns (no signed image URLs; paths only).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    { data: profile },
    { data: contacts },
    { data: timeline_items },
    { data: pinned_facts },
    { data: generations },
    { data: reminders },
    { data: reports },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("contacts").select("*").eq("user_id", user.id),
    supabase.from("timeline_items").select("*").eq("user_id", user.id),
    supabase.from("pinned_facts").select("*").eq("user_id", user.id),
    supabase.from("generations").select("*").eq("user_id", user.id),
    supabase.from("reminders").select("*").eq("user_id", user.id),
    supabase.from("abuse_reports").select("*").eq("user_id", user.id),
  ]);

  const timelineIds = (timeline_items ?? []).map((t) => t.id);
  let timeline_files: { timeline_item_id: string; storage_path: string; sort_order: number; mime: string | null }[] =
    [];
  if (timelineIds.length) {
    const { data: files } = await supabase.from("timeline_item_files").select("timeline_item_id, storage_path, sort_order, mime").in("timeline_item_id", timelineIds);
    timeline_files = files ?? [];
  }

  const exportedAt = new Date().toISOString();
  const body = {
    exported_at: exportedAt,
    user: {
      id: user.id,
      email: user.email,
      auth_created_at: user.created_at,
    },
    profile: profile ?? null,
    contacts: contacts ?? [],
    timeline_items: timeline_items ?? [],
    timeline_item_files: timeline_files,
    pinned_facts: pinned_facts ?? [],
    generations: generations ?? [],
    reminders: reminders ?? [],
    abuse_reports: reports ?? [],
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Disposition": `attachment; filename="dating-copilot-export-${exportedAt.slice(0, 10)}.json"`,
    },
  });
}
