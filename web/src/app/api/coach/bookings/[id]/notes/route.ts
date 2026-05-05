import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  homework: z.array(z.string().max(2000)).max(40),
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const bookingId = params.id;

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

  const homework = parsed.data.homework;

  const { data: note, error } = await supabase
    .from("booking_coach_notes")
    .insert({
      booking_id: bookingId,
      coach_user_id: user.id,
      homework: homework.map((h) => h.trim()).filter(Boolean),
    })
    .select("id, created_at")
    .single();

  if (error || !note) {
    return NextResponse.json({ error: "Unable to save note (check booking ownership)." }, { status: 403 });
  }

  return NextResponse.json({ id: note.id, created_at: note.created_at });
}
