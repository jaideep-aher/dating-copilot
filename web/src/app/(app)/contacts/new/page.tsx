import Link from "next/link";
import { submitManualContactCreate } from "@/app/actions/contacts";

export default function NewContactPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <Link className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline" href="/contacts">
          ← Contacts
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-amber-800">Manual add</p>
        <h1 className="mt-4 text-4xl font-serif text-zinc-900">Spin up another dossier</h1>
      </div>
      <form action={submitManualContactCreate} className="space-y-6 rounded-[36px] border border-zinc-100 bg-white p-10 shadow-[0_30px_80px_rgba(15,21,53,0.08)]">
        <input name="name_confirmed" type="hidden" value="true" />
        <div className="space-y-4">
          <label className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500" htmlFor="display_name">
            Display name / nickname
          </label>
          <input
            className="w-full rounded-3xl border border-zinc-200 px-6 py-4 text-lg outline-none ring-amber-900/35 focus:border-amber-700 focus:ring-4"
            id="display_name"
            maxLength={120}
            name="display_name"
            placeholder="Kali • match from Hinge"
            required
            type="text"
          />
        </div>
        <button className="w-full rounded-full bg-zinc-900 py-4 text-white shadow-lg shadow-black/30" type="submit">
          Create contact envelope
        </button>
      </form>
      <p className="text-xs text-zinc-500">
        Need OCR help grabbing a tentative name before you freeze it? Jump to&nbsp;
        <Link className="font-semibold text-zinc-900 underline underline-offset-4" href="/contacts/from-screenshots">
          From screenshots.</Link>
      </p>
    </div>
  );
}
