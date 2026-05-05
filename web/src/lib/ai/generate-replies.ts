import OpenAI from "openai";
import { z } from "zod";

const generationSchema = z.object({
  variants: z
    .array(
      z.object({
        label: z.string(),
        text: z.string(),
      }),
    )
    .min(2)
    .max(5),
  cautions: z.array(z.string()),
  next_step: z.string(),
  explain: z.string().optional(),
});

export type GenerationPayload = z.infer<typeof generationSchema>;

export function mockGeneration(): GenerationPayload {
  return {
    variants: [
      { label: "safe", text: "Hey — had a good time chatting. Want to grab coffee this week?" },
      {
        label: "playful",
        text: "You’re dangerously easy to talk to. Coffee before I start oversharing?",
      },
      {
        label: "direct",
        text: "I’d like to take you out. Are you free Thursday evening?",
      },
    ],
    cautions: [
      "Set OPENAI_API_KEY for personalized lines. This is placeholder copy.",
      "Match length and tone to how they’ve been texting you.",
    ],
    next_step: "Propose one specific time window and a low-pressure plan (coffee or a walk).",
    explain:
      "Without an API key or full chat context, replies stay generic — add notes or enable AI in .env.local.",
  };
}

export async function generateWithOpenAI(input: {
  contactName: string;
  userTone: string;
  instruction?: string;
  contextText: string;
  imageParts: { url: string }[];
}): Promise<GenerationPayload | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });

  const system = `You are a dating communication coach. The user will send context about ONE specific person (their match). 
Produce reply suggestions the user can copy. Never encourage harassment, coercion, stalking, or dishonesty. 
Keep each variant under 120 words. Labels must be: safe, playful, direct (and add up to 2 more if useful: short, warm).

Respond ONLY with valid JSON matching this shape:
{"variants":[{"label":"string","text":"string"}],"cautions":["string"],"next_step":"string","explain":"optional string"}

The user tone preference is: ${input.userTone}.
The contact display name is: ${input.contactName}.`;

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: `Context (notes and descriptions):\n${input.contextText}` },
  ];
  if (input.instruction?.trim()) {
    userContent.push({ type: "text", text: `Extra instruction: ${input.instruction.trim()}` });
  }
  for (const img of input.imageParts) {
    userContent.push({ type: "image_url", image_url: { url: img.url } });
  }

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
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
  const decoded = generationSchema.safeParse(parsed);
  if (!decoded.success) return null;
  return decoded.data;
}
