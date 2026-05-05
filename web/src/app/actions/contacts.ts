"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_PINNED_FACTS } from "@/lib/constants";
import { maxContactsForProfile, type QuotaProfile } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export async function createContact(formData: FormData) {
  const displayName = String(formData.get("display_name") || "").trim();
  const nameConfirmedRaw = String(formData.get("name_confirmed") ?? "true");
  const nameConfirmed = nameConfirmedRaw === "true" || nameConfirmedRaw === "on";

  if (displayName.length < 1 || displayName.length > 120) {
    return { ok: false as const, error: "Name must be 1–120 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required." };

  const { data: entProfile, error: entErr } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (entErr || !entProfile) {
    return { ok: false as const, error: "Profile missing." };
  }

  const contactCap = maxContactsForProfile(entProfile as QuotaProfile);
  if (contactCap !== null) {
    const { count } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("archived_at", null);
    if ((count ?? 0) >= contactCap) {
      return {
        ok: false as const,
        error: `You can track up to ${contactCap} active contacts on the free plan. Archive one or upgrade.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      display_name: displayName,
      name_confirmed: nameConfirmed,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Could not create contact." };
  }

  revalidatePath("/contacts");
  return { ok: true as const, id: data.id };
}

export async function submitManualContactCreate(formData: FormData): Promise<void> {
  const result = await createContact(formData);
  if (result.ok && "id" in result) {
    redirect(`/contacts/${result.id}`);
  }
}

export async function submitContactArchive(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const shouldArchive = mode === "archive";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !contactId) {
    return;
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      archived_at: shouldArchive ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return;
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export async function submitTimelineDelete(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  if (!contactId || !itemId) {
    return;
  }
  await deleteTimelineItem(contactId, itemId);
}

export async function submitPinnedDelete(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  const factId = String(formData.get("fact_id") ?? "");
  if (!contactId || !factId) {
    return;
  }
  await deletePinnedFact(contactId, factId);
}

export async function submitConfirmContactName(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;
  await confirmContactName(contactId);
}

export async function confirmContactName(contactId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("contacts")
    .update({ name_confirmed: true, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("user_id", user.id);

  revalidatePath(`/contacts/${contactId}`);
}

export async function addTimelineNote(contactId: string, formData: FormData) {
  const text = String(formData.get("note") || "").trim();
  if (text.length < 1 || text.length > 8000) {
    return { ok: false as const, error: "Note must be 1–8000 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const { error } = await supabase.from("timeline_items").insert({
    user_id: user.id,
    contact_id: contactId,
    kind: "note",
    note_text: text,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true as const };
}

export async function addTimelineScreenshots(contactId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) {
    return { ok: false as const, error: "Choose at least one image." };
  }

  const ocrPreview = String(formData.get("ocr_preview") || "").slice(0, 2000);

  const { data: item, error: itemError } = await supabase
    .from("timeline_items")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      kind: "screenshots",
      ocr_preview: ocrPreview || null,
    })
    .select("id")
    .single();

  if (itemError || !item) {
    return { ok: false as const, error: itemError?.message ?? "Could not create item." };
  }

  let order = 0;
  for (const file of files) {
    const safeExt =
      file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `${user.id}/${contactId}/${item.id}/${order}.${safeExt}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upError } = await supabase.storage.from("timeline-uploads").upload(path, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (upError) {
      return { ok: false as const, error: upError.message };
    }
    const { error: linkError } = await supabase.from("timeline_item_files").insert({
      timeline_item_id: item.id,
      storage_path: path,
      sort_order: order,
      mime: file.type || null,
    });
    if (linkError) {
      return { ok: false as const, error: linkError.message };
    }
    order += 1;
  }

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true as const };
}

export async function addPinnedFact(contactId: string, formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  if (body.length < 1 || body.length > 500) {
    return { ok: false as const, error: "Fact must be 1–500 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const { count } = await supabase
    .from("pinned_facts")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId);

  if ((count ?? 0) >= MAX_PINNED_FACTS) {
    return { ok: false as const, error: `Max ${MAX_PINNED_FACTS} pinned facts per contact.` };
  }

  const { error } = await supabase.from("pinned_facts").insert({
    user_id: user.id,
    contact_id: contactId,
    body,
    sort_order: count ?? 0,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true as const };
}

export async function deletePinnedFact(contactId: string, factId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const { error } = await supabase
    .from("pinned_facts")
    .delete()
    .eq("id", factId)
    .eq("contact_id", contactId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true as const };
}

export async function deleteTimelineItem(contactId: string, itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const { data: files } = await supabase
    .from("timeline_item_files")
    .select("storage_path")
    .eq("timeline_item_id", itemId);

  if (files?.length) {
    const paths = files.map((f) => f.storage_path);
    await supabase.storage.from("timeline-uploads").remove(paths);
  }

  const { error } = await supabase
    .from("timeline_items")
    .delete()
    .eq("id", itemId)
    .eq("contact_id", contactId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true as const };
}

export async function updateProfile(formData: FormData): Promise<void> {
  const displayName = String(formData.get("display_name") || "").trim();
  const tone = String(formData.get("default_tone") || "neutral");
  const timezone = String(formData.get("timezone") ?? "UTC").trim().slice(0, 80);
  const allowed = new Set(["playful", "neutral", "direct"]);
  if (!allowed.has(tone)) {
    return;
  }
  if (displayName.length > 80) {
    return;
  }
  if (timezone.length < 2 || timezone.length > 80) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName.length ? displayName : null,
      default_tone: tone,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return;
  revalidatePath("/settings");
  revalidatePath("/contacts");
}

export async function submitTimelineNoteForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;
  await addTimelineNote(contactId, formData);
}

export async function submitTimelineScreenshotsForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;
  await addTimelineScreenshots(contactId, formData);
}

export async function submitPinnedFactForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;
  await addPinnedFact(contactId, formData);
}
