/** Shared label for planners & exports (timeline rows from DB). */
export type TimelinePlannerInput = {
  id: string;
  kind: string;
  note_text: string | null;
  ocr_preview: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  screenshotsCount?: number;
};

function formatUtcLabel(iso: string) {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
}

export function summarizeTimelinePlannerRow(entry: TimelinePlannerInput): string {
  if (entry.kind === "note") {
    return entry.note_text ? entry.note_text.slice(0, 160) : "(empty)";
  }
  if (entry.kind === "screenshots") {
    const count = entry.screenshotsCount ?? 0;
    const preview = entry.ocr_preview ? ` · preview: ${entry.ocr_preview.slice(0, 60)}…` : "";
    return `${count} screenshots${preview}`;
  }
  if (entry.kind === "date_event") {
    const p = entry.payload ?? {};
    const activity = typeof p.activity === "string" ? p.activity : "plan";
    const starts = typeof p.starts_at_utc === "string" ? p.starts_at_utc : entry.created_at;
    const tz = typeof p.timezone === "string" ? p.timezone : "UTC";
    const venue = typeof p.location_note === "string" ? p.location_note.slice(0, 80) : "";
    const vibe = typeof p.vibe_goal === "string" ? p.vibe_goal : "";
    return `Scheduled ${activity} · ${formatUtcLabel(starts)} (${tz})${venue ? ` · ${venue}` : ""}${vibe ? ` · vibe:${vibe}` : ""}`;
  }
  if (entry.kind === "debrief") {
    const draft = entry.payload?.draft as Record<string, unknown> | undefined;
    const mood = typeof draft?.mood_1_5 === "number" ? `${draft.mood_1_5}/5` : "?";
    const wx = typeof draft?.what_next === "string" ? draft.what_next : "";
    return `Debrief mood ${mood}${wx ? ` · ${wx}` : ""}`;
  }
  return entry.kind;
}

export function contextBlockForAi(entry: TimelinePlannerInput): string {
  if (entry.kind === "debrief") {
    const ai = entry.payload?.ai as Record<string, unknown> | undefined;
    const draft = entry.payload?.draft ?? {};
    return `DEBRIEF entry (${entry.created_at}). Draft snapshot: ${JSON.stringify(draft).slice(0, 2800)}\nCoach output summary: framings/scripts stored in dossier.${ai ? " (Structured AI output available separately.)" : ""}`;
  }
  if (entry.kind === "date_event") {
    return `DATE EVENT (${entry.created_at}): ${JSON.stringify(entry.payload ?? {})}`;
  }
  return `${entry.kind.toUpperCase()} (${entry.created_at}): ${summarizeTimelinePlannerRow(entry)}`;
}
