import Link from "next/link";
import { FromScreenshotsClient } from "@/components/from-screenshots-client";

export default function FromScreenshotsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/contacts">
          ← Contacts
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-amber-800">Screenshot intake</p>
        <h1 className="mt-4 text-4xl font-serif text-zinc-900">Name suggestions + uploads</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">
          Drop in a representative screenshot for quick vision guesses, double-check spelling, attach the captures you
          want on the dossier timeline, then we&apos;ll tuck everything under just that person.
        </p>
      </div>
      <FromScreenshotsClient />
    </div>
  );
}
