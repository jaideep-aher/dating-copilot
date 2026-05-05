import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const hdr = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron) return true;
  if (secret && hdr === `Bearer ${secret}`) return true;
  return process.env.NODE_ENV === "development" && req.headers.get("x-dev-cron") === "1";
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    return NextResponse.json({ ok: true, skipped: "No service role configured" });
  }

  const admin = createSupabaseAdmin(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const { data: due, error } = await admin
    .from("reminders")
    .select("id, user_id, contact_id, title, note, remind_at")
    .is("sent_at", null)
    .lte("remind_at", nowIso)
    .limit(40);

  if (error || !due?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Wingboard <onboarding@resend.dev>";
  const resend = resendKey ? new Resend(resendKey) : null;

  let emails = 0;
  let failures = 0;

  for (const row of due) {
    let emailAddr: string | null = null;
    try {
      const { data, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
      if (userErr || !data.user?.email) {
        await admin.from("reminders").update({ email_error: "no_email" }).eq("id", row.id);
        failures += 1;
        continue;
      }
      emailAddr = data.user.email;

      if (!resend) {
        await admin.from("reminders").update({ email_error: "resend_not_configured" }).eq("id", row.id);
        failures += 1;
        continue;
      }

      const noteBlock = row.note ? `<p style="margin-top:12px">${escapeHtml(row.note)}</p>` : "";
      await resend.emails.send({
        from,
        to: emailAddr,
        subject: `Reminder: ${row.title}`,
        html: `<p><strong>${escapeHtml(row.title)}</strong></p>${noteBlock}<p style="color:#666;font-size:13px">Contact id: ${row.contact_id}</p>`,
      });

      await admin.from("reminders").update({ sent_at: new Date().toISOString(), email_error: null }).eq("id", row.id);
      emails += 1;
    } catch (e) {
      failures += 1;
      const msg = e instanceof Error ? e.message.slice(0, 500) : "send_failed";
      await admin.from("reminders").update({ email_error: msg }).eq("id", row.id);
    }
  }

  return NextResponse.json({ ok: true, due: due.length, emails, failures });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
