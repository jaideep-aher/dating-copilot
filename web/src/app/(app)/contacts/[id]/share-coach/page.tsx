import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShareCoachContextWizard } from "@/components/share-coach-context-wizard";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function ContactShareCoachPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, display_name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!contact) {
    notFound();
  }

  const [{ data: pins }, { data: timeline }, { data: coaches }] = await Promise.all([
    supabase
      .from("pinned_facts")
      .select("id, body, sort_order")
      .eq("contact_id", contact.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("timeline_items")
      .select("id, kind, note_text, ocr_preview, created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false }),
    supabase.from("coaches").select("id, slug, headline").order("headline", { ascending: true }),
  ]);

  const timelineRows = timeline ?? [];
  const shotIds = timelineRows.filter((i) => i.kind === "screenshots").map((i) => i.id);
  let fileGrouping: Record<string, number> = {};
  if (shotIds.length) {
    const { data: fileLinks } = await supabase.from("timeline_item_files").select("timeline_item_id").in("timeline_item_id", shotIds);
    fileGrouping =
      fileLinks?.reduce<Record<string, number>>((acc, row) => {
        acc[row.timeline_item_id] = (acc[row.timeline_item_id] ?? 0) + 1;
        return acc;
      }, {}) ?? {};
  }

  const plannerTimeline = [...timelineRows]
    .reverse()
    .map((item) => {
      if (item.kind === "note") {
        return {
          id: item.id,
          kind: item.kind,
          snapshot: item.note_text ? item.note_text.slice(0, 160) : "(empty)",
        };
      }
      const count = fileGrouping[item.id] ?? 0;
      const preview = item.ocr_preview ? ` · preview: ${item.ocr_preview.slice(0, 60)}…` : "";
      return {
        id: item.id,
        kind: item.kind,
        snapshot: `${count} screenshots${preview}`,
      };
    })
    .reverse();

  return (
    <div className="space-y-10">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href={`/contacts/${contact.id}`}>
          ← {contact.display_name}
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.36em] text-amber-900">Stage · human coach</p>
        <h1 className="mt-4 text-4xl font-serif text-zinc-900">Scoped context pack</h1>
      </div>

      <ShareCoachContextWizard
        coaches={coaches ?? []}
        contactId={contact.id}
        contactName={contact.display_name}
        pins={(pins ?? []).map((p) => ({ id: p.id, body: p.body }))}
        timeline={plannerTimeline}
      />
    </div>
  );
}
