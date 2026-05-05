import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfile } from "@/app/actions/contacts";
import { isAppAdmin } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAppAdmin(supabase, user);

  const { data: profile } = await supabase.from("profiles").select("display_name, default_tone").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          <Link className="underline-offset-4 hover:text-zinc-900 hover:underline" href="/contacts">
            ← Contacts
          </Link>
          <Link className="underline-offset-4 hover:text-zinc-900 hover:underline" href="/settings/billing">
            Billing · data export
          </Link>
          {admin ? (
            <Link className="underline-offset-4 hover:text-zinc-900 hover:underline" href="/settings/admin/coaches">
              Admin · coach verification
            </Link>
          ) : null}
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.38em] text-amber-900">Settings</p>
        <h1 className="mt-4 text-4xl font-serif text-zinc-900">Tune your voice baseline</h1>
        <p className="mt-3 text-base text-zinc-600">Planners lean on this palette when they improvise lines for you.</p>
      </div>

      <form action={updateProfile} className="space-y-6 rounded-[38px] border border-zinc-100 bg-white p-10 shadow-[0_40px_120px_rgba(10,12,40,0.09)]">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500" htmlFor="display_name">
            Preferred first name inside the product
          </label>
          <input
            className="mt-3 w-full rounded-3xl border border-zinc-200 px-5 py-4 text-lg"
            defaultValue={profile?.display_name ?? ""}
            id="display_name"
            maxLength={80}
            name="display_name"
            placeholder="How we should greet you"
            type="text"
          />
        </div>
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500">Default tonal bias</legend>
          {(["neutral", "playful", "direct"] as const).map((tone) => (
            <label className="flex items-center gap-3 text-lg font-semibold text-zinc-900" key={tone}>
              <input defaultChecked={profile?.default_tone === tone} name="default_tone" type="radio" value={tone} />
              {tone}
            </label>
          ))}
        </fieldset>
        <button className="w-full rounded-full bg-zinc-900 py-4 text-base font-semibold text-white" type="submit">
          Save preferences
        </button>
      </form>
    </div>
  );
}
