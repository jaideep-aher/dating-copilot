export default async function SetupRequired(props: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolved = props.searchParams ? await props.searchParams : undefined;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 leading-relaxed text-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-800">Bootstrap checklist</p>
      <h1 className="mt-4 text-4xl font-serif text-zinc-950">Configure Supabase before Wingboard loads</h1>

      <p className="mt-6 text-base text-zinc-600">
        The authenticated area needs project keys. After that, paste the Stage&nbsp;1 SQL migration from the monorepo
        into Supabase&nbsp;Studio and enable&nbsp;OAuth providers you intend to&nbsp;offer.
      </p>

      {resolved?.next ? (
        <p className="mt-8 rounded-3xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
          After keys are wired, revisit <span className="font-mono text-xs">{resolved.next}</span> from the navbar.
        </p>
      ) : null}

      <ol className="mt-12 list-decimal space-y-10 pl-5 text-lg">
        <li>
          Duplicate <span className="font-mono text-sm">web/.env.example</span> to{" "}
          <span className="font-mono text-sm">web/.env.local</span>.
        </li>
        <li>
          In Supabase, create project URL + anon publishable keys and drop them into the{" "}
          <span className="font-semibold text-zinc-900">NEXT_PUBLIC_SUPABASE_*</span> placeholders.
        </li>
        <li>
          Open <span className="font-mono text-[0.82rem]">supabase/migrations/20260505000000_stage1.sql</span> and run it
          in the SQL Editor (profiles trigger, contacts, timeline + storage&nbsp;bucket).
        </li>
        <li>
          In Auth → Providers, enable Google OAuth (and/or Email magic links). Set Email redirect/site URL so magic
          links land on{" "}
          <span className="font-mono text-sm">http://localhost:3000/auth/callback</span> whenever you&nbsp;iterate
          locally.
        </li>
        <li className="md:whitespace-normal">
          Optional creativity pass: populate <span className="font-mono text-[0.8rem]">OPENAI_API_KEY</span>
          — otherwise the planner falls back on thoughtful placeholder copy&nbsp;responses.
        </li>
      </ol>
    </div>
  );
}
