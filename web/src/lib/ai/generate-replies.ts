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
  replyLengthPreset?: "short" | "medium" | "long";
  flirtLevel?: "low" | "medium" | "high";
  emojiPreferred?: boolean | null;
}): Promise<GenerationPayload | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });

  const preset = input.replyLengthPreset ?? "medium";
  const lengthHints =
    preset === "short"
      ? "Each variant ≤ 55 words."
      : preset === "long"
        ? "Each variant may stretch toward ~220 words only when helpful."
        : "Each variant ~90–140 words.";
  const flirt = input.flirtLevel ?? "medium";
  const flirtHint =
    flirt === "low"
      ? "Keep romantic charge subtle and friendly-by-default."
      : flirt === "high"
        ? "Brighter flirt allowed when reciprocity cues exist — never crude or pushy."
        : "Warm and lightly playful unless context says otherwise.";
  const emojiHint =
    input.emojiPreferred === true
      ? "Sprinkle sparingly — at most ONE emoji overall across all variants."
      : input.emojiPreferred === false
        ? "Do NOT use emojis."
        : "Default to no emoji unless it clearly matches how they text you.";

  const system = `You are a dating communication coach. The user will send context about ONE specific person (their match). 
Produce reply suggestions the user can copy. Never encourage harassment, coercion, stalking, or dishonesty.
Labels must include: safe, playful, direct (you may add up to two more labels like warm or short clarifier).

${lengthHints}
${flirtHint}
${emojiHint}

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
