"use server";

import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const DATE_ACTIVITIES = new Set(["coffee", "dinner", "drinks", "walk", "other"]);
const VIBES = new Set(["casual", "intimate", "unclear"]);

export async function submitDateEventForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  const date = String(formData.get("starts_date") ?? "");
  const time = String(formData.get("starts_time") ?? "");
  const timezone = String(formData.get("timezone") ?? "UTC").slice(0, 80);
  const activity = String(formData.get("activity") ?? "coffee");
  const locationNote = String(formData.get("location_note") ?? "").slice(0, 2000);
  const outfitNote = String(formData.get("outfit_note") ?? "").slice(0, 2000);
  const vibe_goal = String(formData.get("vibe_goal") ?? "casual");

  if (!contactId || !date || !time) return;
  const safeActivity = DATE_ACTIVITIES.has(activity) ? activity : "coffee";
  const safeVibe = VIBES.has(vibe_goal) ? vibe_goal : "casual";

  const localIso = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const startsUtc = fromZonedTime(localIso, timezone);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const noteText = `Date · ${safeActivity} · ${startsUtc.toISOString()} (${timezone})`;

  const { error } = await supabase.from("timeline_items").insert({
    user_id: user.id,
    contact_id: contactId,
    kind: "date_event",
    note_text: noteText,
    payload: {
      starts_at_utc: startsUtc.toISOString(),
      timezone,
      activity: safeActivity,
      location_note: locationNote || null,
      outfit_note: outfitNote || null,
      vibe_goal: safeVibe,
    },
  });

  if (error) return;
  revalidatePath(`/contacts/${contactId}`);
}

export async function submitReminderForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const date = String(formData.get("remind_date") ?? "");
  const time = String(formData.get("remind_time") ?? "");
  const timezone = String(formData.get("timezone") ?? "UTC").slice(0, 80);

  if (!contactId || !title || !date || !time) return;

  const localIso = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const remindAt = fromZonedTime(localIso, timezone);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("reminders").insert({
    user_id: user.id,
    contact_id: contactId,
    title,
    note: note || null,
    remind_at: remindAt.toISOString(),
    timezone,
    channel: "email",
  });

  if (error) return;
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
}

export async function submitDeleteReminder(formData: FormData): Promise<void> {
  const id = String(formData.get("reminder_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("reminders").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/contacts");
}
