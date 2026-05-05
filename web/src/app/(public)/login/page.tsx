import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolved = props.searchParams ? await props.searchParams : undefined;
  const nextPathRaw = resolved?.next;
  const nextPath = typeof nextPathRaw === "string" && nextPathRaw.startsWith("/") ? nextPathRaw : "/contacts";

  if (!isSupabaseConfigured()) redirect("/setup-required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(nextPath);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10 px-6 py-16">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/">
          ← Home
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Sign in</p>
        <h1 className="mt-2 text-4xl font-serif text-zinc-900">Access your Wingboard</h1>
        <p className="mt-3 text-lg text-zinc-600">
          Context stays partitioned by contact inside the authenticated app.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-600">Loading…</p>}>
        <LoginForm configured={isSupabaseConfigured()} nextPath={nextPath} />
      </Suspense>
    </div>
  );
}
