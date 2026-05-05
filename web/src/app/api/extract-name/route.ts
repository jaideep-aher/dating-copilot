import { NextResponse } from "next/server";
import { z } from "zod";
import { extractNameFromImage, mockExtraction } from "@/lib/ai/extract-name";

export const maxDuration = 60;

const bodySchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/png"),
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
