import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/contacts");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Stage 1 web MVP</p>
      <h1 className="mt-3 text-balance font-serif text-4xl leading-tight text-zinc-900">
        Dating copilot with memory per person
      </h1>
      <p className="mt-6 text-pretty text-lg leading-relaxed text-zinc-600">
        Capture screenshots or notes into a timeline for someone you&apos;re texting, pin what matters, then get reply
        options grounded in&nbsp;
        <em>their</em> thread — not mashed together with anyone else&apos;s chat.
      </p>
      {!isSupabaseConfigured() ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          Supabase variables are missing. Follow the checklist on <Link className="font-semibold underline" href="/setup-required">Setup required</Link> before signing in.</div>) : null}
      <ul className="mt-10 space-y-3 text-sm leading-relaxed text-zinc-700">
        <li>Contacts are isolated; context stays scoped.</li>
        <li>Name suggestions leverage vision when OPENAI_API_KEY is present.</li>
        <li>Free generations per rolling month enforced on the API.</li>
      </ul>
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-800"
          href={isSupabaseConfigured() ? "/login" : "/setup-required"}
        >
          Configure &amp; enter
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-900 transition hover:border-zinc-400 hover:bg-white"
          href="/setup-required"
        >
          Read Supabase checklist
        </Link>
      </div>
      <p className="mt-14 text-xs text-zinc-500">
        Responsible use: only upload chats you&apos;re allowed to reuse. Humans-as-coaches come in later PRD stages —
        this codebase covers Stage&nbsp;1.
      </p>
    </div>
  );
}
