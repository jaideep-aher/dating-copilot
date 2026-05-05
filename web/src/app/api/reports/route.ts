import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  generationId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  category: z.string().trim().max(80).optional().default("generation_output"),
  detail: z.string().trim().max(8000).optional(),
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

  const { generationId, contactId, category, detail } = parsed.data;

  if (generationId) {
    const { data: gen } = await supabase
      .from("generations")
      .select("id")
      .eq("id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!gen) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }
  }

  if (contactId) {
    const { data: c } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!c) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  }

  const { data: row, error } = await supabase
    .from("abuse_reports")
    .insert({
      user_id: user.id,
      generation_id: generationId ?? null,
      contact_id: contactId ?? null,
      category,
      detail: detail?.length ? detail : null,
    })
    .select("id, created_at")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Could not save report" }, { status: 500 });
  }

  return NextResponse.json({ id: row.id, created_at: row.created_at });
}
