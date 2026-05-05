import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-[calc(100vh-10rem)]">
      <header className="border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-6">
          <Link className="font-serif text-2xl text-zinc-900" href="/contacts">
            Wingboard
          </Link>
          <nav className="flex flex-1 gap-6 text-base font-semibold text-zinc-900">
            <Link className="hover:text-zinc-600 hover:underline underline-offset-[6px]" href="/contacts">
              Contacts
            </Link>
            <Link className="hover:text-zinc-600 hover:underline underline-offset-[6px]" href="/contacts/new">
              New
            </Link>
            <Link className="hover:text-zinc-600 hover:underline underline-offset-[6px]" href="/contacts/from-screenshots">
              From screenshots
            </Link>
            <Link className="hover:text-zinc-600 hover:underline underline-offset-[6px]" href="/coaches">
              Coaches
            </Link>
            <Link className="hover:text-zinc-600 hover:underline underline-offset-[6px]" href="/coach">
              Coach desk
            </Link>
            <Link className="hover:text-zinc-600 hover:underline underline-offset-[6px]" href="/settings">
              Settings
            </Link>
          </nav>
          <div className="hidden text-right text-xs text-zinc-500 sm:block">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-zinc-400">Active email</p>
            <p className="mt-1 text-sm text-zinc-900">{user?.email ?? (error ? "Unknown" : "—")}</p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
