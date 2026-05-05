"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-900 disabled:opacity-60"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const supabase = createClient();
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
          router.refresh();
        });
      }}
      type="button"
    >
      Sign out
    </button>
  );
}
