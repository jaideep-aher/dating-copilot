import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(4000).optional(),
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

  const { bookingId, rating, comment } = parsed.data;

  const { data: row, error } = await supabase
    .from("coach_ratings")
    .insert({
      booking_id: bookingId,
      client_user_id: user.id,
      rating,
      comment: comment?.length ? comment : null,
    })
    .select("id")
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json({ error: "Booking already rated" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to submit rating." }, { status: 403 });
  }

  return NextResponse.json({ id: row?.id });
}
