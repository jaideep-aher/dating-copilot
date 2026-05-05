import Link from "next/link";
import { redirect } from "next/navigation";
import { submitContactArchive } from "@/app/actions/contacts";
import { getQuotaState } from "@/lib/generation-quota";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage(props: {
  searchParams?: Promise<{ show?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedSearch = props.searchParams ? await props.searchParams : undefined;
  const archived = resolvedSearch?.show === "archived";

  const quotaQuery = getQuotaState(supabase, user.id);

  const contactsBase = supabase
    .from("contacts")
    .select("id, display_name, name_confirmed, archived_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const contactsQuery = archived
    ? contactsBase.not("archived_at", "is", null)
    : contactsBase.is("archived_at", null);

  const [quota, { data: contacts, error }] = await Promise.all([quotaQuery, contactsQuery]);

  if (error || !contacts) {
    throw new Error("Could not fetch contacts.");
  }

  function formatPeriodLabel(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-100 pb-8">
        <div className="max-w-xl space-y-2">
          <h1 className="text-4xl font-serif leading-tight text-zinc-900">Contacts</h1>
          <p className="text-base leading-relaxed text-zinc-600">
            Each row carries its own memory — nothing merges across threads unless you do it deliberately.
          </p>
          {quota.profile ? (
            <p className="text-sm text-zinc-500">
              Generations consumed this quota window:&nbsp;
              <span className="font-semibold text-zinc-900">
                {quota.used}/{quota.limit}
              </span>
              <span className="text-zinc-400">
                {" "}
                • window started {formatPeriodLabel(quota.profile.generation_period_start)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 text-base font-semibold text-zinc-900">
          <Link className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-white shadow-lg shadow-black/25" href="/contacts/new">
            Add manually
          </Link>
          <Link
            className="inline-flex rounded-full border border-zinc-200 px-5 py-3 backdrop-blur"
            href="/contacts/from-screenshots"
          >
            Start from screenshots
          </Link>
          <Link
            className="text-center text-sm font-semibold text-zinc-500 underline-offset-[6px] hover:text-zinc-900 hover:underline"
            href={archived ? "/contacts" : "/contacts?show=archived"}
          >
            {archived ? "Showing archived → show active" : "View archived"}
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {contacts.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-zinc-300 bg-white px-10 py-12 text-lg text-zinc-600 shadow-inner shadow-zinc-100">
            Nobody here yet — add someone manually or ingest a screenshot bundle to populate their dossier.
          </div>
        ) : (
          <ul className="space-y-4">
            {contacts.map((c) => (
              <li key={c.id}>
                <div className="flex flex-col gap-8 rounded-[32px] border border-zinc-100 bg-white px-8 py-6 shadow-[0_35px_80px_rgba(24,29,53,0.08)] lg:flex-row lg:justify-between lg:gap-14">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Person</p>
                    <Link className="mt-4 block font-serif text-4xl leading-tight text-zinc-900" href={`/contacts/${c.id}`}>
                      {c.display_name}
                    </Link>
                    <p className="mt-4 text-[0.8rem] font-semibold text-zinc-500">
                      {c.name_confirmed ? "Confirmed name chip" : "Double-check OCR names when you settle on one"}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between gap-6 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    <p className="text-sm lowercase text-zinc-400">created {formatPeriodLabel(c.created_at)}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <Link className="text-base font-semibold text-zinc-900 underline-offset-[10px] hover:underline" href={`/contacts/${c.id}`}>
                        Open dossier →
                      </Link>
                      <form action={submitContactArchive}>
                        <input name="contact_id" type="hidden" value={c.id} />
                        <input name="mode" type="hidden" value={c.archived_at ? "restore" : "archive"} />
                        <button
                          className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-[0.7rem] uppercase tracking-[0.2em] hover:border-zinc-400"
                          type="submit"
                        >
                          {c.archived_at ? "Restore row" : "Archive row"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
