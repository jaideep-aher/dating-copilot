"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  configured,
  nextPath,
}: {
  configured: boolean;
  nextPath: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Missing Supabase keys. Copy&nbsp;
        <code className="rounded bg-white px-1 py-0.5 text-[0.85rem]">web/.env.example</code>&nbsp;
        into <code className="rounded bg-white px-1 py-0.5 text-[0.85rem]">web/.env.local</code>.
      </div>
    );
  }

  async function signInWithMagicLink(ev: React.FormEvent) {
    ev.preventDefault();
    setStatus("idle");
    setMessage(null);

    try {
      const supabase = createClient();
      const params = new URLSearchParams({ next: nextPath });
      const emailRedirectTo = `${window.location.origin}/auth/callback?${params.toString()}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      setStatus("sent");
      setMessage(`Check ${email} for a sign-in link.`);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Could not send link.");
    }
  }

  async function signInWithGoogle() {
    setStatus("idle");
    setMessage(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Could not start Google sign-in.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-medium text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-70"
          onClick={() => signInWithGoogle()}
          type="button"
        >
          Continue with Google
        </button>

        <form className="space-y-4" onSubmit={signInWithMagicLink}>
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500" htmlFor="email">
              Work email / personal email
            </label>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none ring-amber-700/35 focus:border-amber-500 focus:ring-4"
              id="email"
              name="email"
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-70"
            type="submit"
          >
            Email me a magic link
          </button>
        </form>
      </div>

      {(error === "auth" || status === "error") && message === null ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          We couldn&apos;t complete sign-in from that link — try requesting a fresh magic link below.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {message}
        </div>
      ) : null}

      <div className="text-center text-sm text-zinc-500">
        <Link href="/setup-required">Supabase checklist</Link>
        {" · "}
        <Link href="/">← Back home</Link>
      </div>
    </div>
  );
}
