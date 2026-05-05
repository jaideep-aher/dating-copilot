import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "timeline-uploads";

/** Best-effort recursive list of object paths under `prefix` (e.g. user id). */
async function listObjectPathsUnder(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !data?.length) return out;

  for (const obj of data) {
    const path = `${prefix}/${obj.name}`;
    if (obj.id) {
      out.push(path);
    } else {
      out.push(...(await listObjectPathsUnder(admin, path)));
    }
  }
  return out;
}

/** Remove all timeline-uploads objects for a user (nested layout). */
export async function removeTimelineUploadsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const paths = await listObjectPathsUnder(admin, userId);
  if (!paths.length) return;
  const chunk = 500;
  for (let i = 0; i < paths.length; i += chunk) {
    const slice = paths.slice(i, i + chunk);
    await admin.storage.from(BUCKET).remove(slice);
  }
}
