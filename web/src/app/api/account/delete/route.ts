import { NextResponse } from "next/server";
import { z } from "zod";
import { removeTimelineUploadsForUser } from "@/lib/storage-cleanup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  confirmPhrase: z.literal("DELETE MY ACCOUNT"),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Send JSON { "confirmPhrase": "DELETE MY ACCOUNT" } to confirm permanent deletion.',
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    await removeTimelineUploadsForUser(admin, user.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("auth.admin.deleteUser", delErr);
      return NextResponse.json({ error: "Could not delete account" }, { status: 500 });
    }
  } catch (e) {
    console.error("account delete", e);
    return NextResponse.json(
      {
        error:
          "Account deletion requires SUPABASE_SERVICE_ROLE_KEY and a valid Supabase URL. Storage cleanup runs first.",
      },
      { status: 503 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
