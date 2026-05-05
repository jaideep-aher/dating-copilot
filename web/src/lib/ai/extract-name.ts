import OpenAI from "openai";
import { z } from "zod";

const schema = z.object({
  suggested_name: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  preview: z.string(),
});

export type NameExtraction = z.infer<typeof schema>;

export function mockExtraction(): NameExtraction {
  return {
    suggested_name: null,
    confidence: "low",
    preview: "",
  };
}

export async function extractNameFromImage(dataUrl: string): Promise<NameExtraction | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });
  const prompt = `Look at this screenshot of a messaging or dating app conversation.
Identify the most likely first name or short display name of the person the USER is talking WITH (the match), not the user's own name.
Return JSON only: {"suggested_name": string or null, "confidence": "low"|"medium"|"high", "preview": "one short vague description of what you see, no private content"}`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const decoded = schema.safeParse(parsed);
  return decoded.success ? decoded.data : null;
}
