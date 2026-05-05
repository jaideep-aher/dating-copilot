import Link from "next/link";
import { notFound } from "next/navigation";
import { adminUnpublishCoach, adminVerifyCoach } from "@/app/actions/admin-coaches";
import { isAppAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCoachQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAppAdmin(supabase, user))) {
    notFound();
  }

  let coaches: Array<Record<string, unknown>> = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin.from("coaches").select("*").order("created_at", { ascending: false });
    coaches = data ?? [];
  } catch {
    coaches = [];
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/settings">
          ← Settings
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.36em] text-amber-900">Admin · coach onboarding</p>
        <h1 className="mt-6 text-4xl font-serif text-zinc-900">Verification queue</h1>
      </div>

      {coaches.length === 0 ? (
        <p className="text-base text-zinc-600">No coach rows loaded — check migrations or SQL seeds.</p>
      ) : (
        <div className="space-y-6">
          {coaches.map((row) => {
            const verified = Boolean(row.verified_at);
            return (
              <article className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-white" key={String(row.id)}>
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-zinc-50 pb-4">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">
                      {verified ? "verified" : "pending"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-900">{String(row.headline)}</h2>
                    <p className="mt-3 font-mono text-sm text-zinc-500">@{String(row.slug)}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!verified ? (
                      <form action={adminVerifyCoach}>
                        <input name="coach_id" type="hidden" value={String(row.id)} />
                        <button
                          className="rounded-full bg-emerald-800 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white"
                          type="submit"
                        >
                          Publish + verify
                        </button>
                      </form>
                    ) : (
                      <form action={adminUnpublishCoach}>
                        <input name="coach_id" type="hidden" value={String(row.id)} />
                        <button
                          className="rounded-full border border-rose-300 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-rose-800"
                          type="submit"
                        >
                          Hide listing
                        </button>
                      </form>
                    )}
                  </div>
                </header>
                <p className="mt-5 whitespace-pre-wrap text-base text-zinc-700">{String(row.bio ?? "")}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
