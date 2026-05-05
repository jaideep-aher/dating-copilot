import OpenAI from "openai";
import { z } from "zod";

export const debriefDraftSchema = z.object({
  mood_1_5: z.number().int().min(1).max(5),
  highlights: z.string().max(4000),
  lows: z.string().max(4000).optional().default(""),
  physical_comfort: z.enum(["comfortable", "mixed", "uncomfortable"]),
  reciprocity: z.enum(["felt_balanced", "i_initiated_more", "they_initiated_more", "unclear"]),
  what_next: z.enum(["second_date_planned", "ambiguous", "cooled_off", "other"]),
  freeform: z.string().max(4000).optional().default(""),
});

export type DebriefDraft = z.infer<typeof debriefDraftSchema>;

const aiSchema = z.object({
  framings: z.array(z.string()).min(2).max(6),
  scripts: z
    .array(
      z.object({
        label: z.string(),
        text: z.string(),
      }),
    )
    .min(2)
    .max(5),
  next_actions: z.array(z.string()).min(2).max(8),
  cautions: z.array(z.string()).min(1).max(8),
});

export type DebriefAiPayload = z.infer<typeof aiSchema>;

export function mockDebrief(): DebriefAiPayload {
  return {
    framings: [
      "They may be pacing themselves — ambiguity after a decent date usually isn’t a verdict yet.",
      "If energy felt mixed, logistics (tired week, texting style) sometimes explain more than lack of interest.",
    ],
    scripts: [
      { label: "soft check-in", text: "I had fun last night — no pressure either way. How are you feeling about it?" },
      {
        label: "concrete pivot",
        text: "Still up for trying that ramen spot? I could do Thursday evening if that lands easy for you.",
      },
      { label: "boundary-preserving pause", text: "I’m going to take a beat and see how things feel in a day or two." },
    ],
    next_actions: [
      "Wait at least 24 hours before sending a follow-up if you’re spiraling.",
      "If you message, add one specific callback to the date (a joke, a moment) so it feels human.",
      "If comfort was mixed, decide your non-negotiables before the next meetup.",
    ],
    cautions: [
      "This isn’t therapy or a read on their inner life — it’s communication planning.",
      "Avoid double-texting a novel if you already sent something substantial.",
    ],
  };
}

export async function debriefWithOpenAI(input: {
  contactName: string;
  userTone: string;
  draft: DebriefDraft;
}): Promise<DebriefAiPayload | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });
  const system = `You are a pragmatic dating communication coach helping someone debrief AFTER a date.
Do not claim to diagnose anyone's psychology. Offer multiple interpretations ("framings"), message scripts they can adapt, practical next actions, and cautions without fear-mongering.
Never encourage coercion, jealousy tactics, dishonesty, or surveillance.
Respond ONLY with JSON:
{"framings":["string"],"scripts":[{"label":"string","text":"string"}],"next_actions":["string"],"cautions":["string"]}
Contact name: ${input.contactName}
User tone pref: ${input.userTone}`;

  const summary = JSON.stringify(input.draft, null, 2);

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Debrief survey answers (JSON):\n${summary}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = aiSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
