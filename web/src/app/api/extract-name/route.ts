import { NextResponse } from "next/server";
import { z } from "zod";
import { extractNameFromImage, mockExtraction } from "@/lib/ai/extract-name";
import { rateLimitOrThrow } from "@/lib/simple-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/png"),
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
    rateLimitOrThrow("api:extract-name", user.id);
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

  const { imageBase64, mimeType } = parsed.data;
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  try {
    const extracted = (await extractNameFromImage(dataUrl)) ?? mockExtraction();
    return NextResponse.json(extracted);
  } catch {
    return NextResponse.json(mockExtraction());
  }
}
