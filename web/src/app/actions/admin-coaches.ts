"use server";

import { revalidatePath } from "next/cache";
import { isAppAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function adminVerifyCoach(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAppAdmin(supabase, user))) {
    return;
  }

  const coachId = String(formData.get("coach_id") ?? "").trim();
  if (!coachId) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("coaches")
      .update({
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", coachId);

    if (error) {
      return;
    }
  } catch {
    return;
  }

  revalidatePath("/settings/admin/coaches");
  revalidatePath("/coaches");
}

export async function adminUnpublishCoach(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAppAdmin(supabase, user))) {
    return;
  }

  const coachId = String(formData.get("coach_id") ?? "").trim();
  if (!coachId) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("coaches")
      .update({
        is_published: false,
        verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coachId);

    if (error) {
      return;
    }
  } catch {
    return;
  }

  revalidatePath("/settings/admin/coaches");
  revalidatePath("/coaches");
}
