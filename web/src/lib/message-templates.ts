/** Copy-ready scenario scripts (Stage 2 templates). */
export const MESSAGE_TEMPLATES = [
  {
    id: "silence-soft",
    title: "After a pause (soft)",
    category: "Follow-up",
    body: `Hey — I know inboxes get noisy. When you’ve got bandwidth, I'd love to pick up where we left off. No rush.`,
  },
  {
    id: "silence-ball",
    title: "Ping with low pressure",
    category: "Follow-up",
    body: `Hope your week’s treating you okay. Still interested in grabbing that coffee if you are — totally fine if timing’s weird.`,
  },
  {
    id: "reschedule",
    title: "Reschedule cleanly",
    category: "Logistics",
    body: `I need to shuffle our plan — apologies. Are you free [day] around [window]? If not, toss me two slots that usually work.`,
  },
  {
    id: "boundary-decline",
    title: "Kind decline",
    category: "Boundaries",
    body: `I’ve really enjoyed chatting, but I don’t feel the chemistry I’d want for a date. Wishing you the best.`,
  },
  {
    id: "boundary-soft-no",
    title: "Softer goodbye",
    category: "Boundaries",
    body: `I’m not feeling the romantic spark on my side, but thanks for meeting me with openness. Take care.`,
  },
  {
    id: "repair-awkward",
    title: "Repair after awkward night",
    category: "Repair",
    body: `I keep thinking about yesterday — thanks for powering through dinner with me. Would you be open to a lighter redo? Zero pressure.`,
  },
  {
    id: "clarify-intent",
    title: "Clarify what you’re looking for",
    category: "Clarity",
    body: `I’m enjoying this. I tend to lean [casual vs serious brief] — curious how you’ve been approaching dating lately.`,
  },
  {
    id: "post-date-thanks",
    title: "Post-date gratitude + thread",
    category: "Follow-up",
    body: `Had a genuinely good time tonight — thanks for [specific beat]. Want to swap two windows that could work later this week?`,
  },
] as const;
