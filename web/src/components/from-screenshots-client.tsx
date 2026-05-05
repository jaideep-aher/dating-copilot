"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { addTimelineScreenshots, createContact } from "@/app/actions/contacts";

type AnalyzeResult = {
  suggested_name?: string | null;
  confidence?: string;
  preview?: string;
};

export function FromScreenshotsClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [confirmName, setConfirmName] = useState(false);
  const [ocrPreview, setOcrPreview] = useState("");
  const [captures, setCaptures] = useState<FileList | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleAnalyze(files: FileList | null) {
    setAnalyzeError(null);
    setAnalyzeResult(null);
    const file = files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      const [, base64] = result.split(",");
      if (!base64) {
        setAnalyzeError("Could not read file.");
        return;
      }

      try {
        const resp = await fetch("/api/extract-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "image/png" }),
        });
        if (!resp.ok) throw new Error("Analyzer failed.");
        const data = await resp.json();
        setAnalyzeResult(data);
        if (data.suggested_name) {
          setDisplayName(String(data.suggested_name));
          setConfirmName(true);
        }
        if (data.preview) {
          setOcrPreview(String(data.preview));
        }
      } catch (e) {
        setAnalyzeError(e instanceof Error ? e.message : "Could not analyze image.");
      }
    };
    reader.readAsDataURL(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  const captureLabel = useMemo(() => {
    if (!captures?.length) return "No bundle selected yet";
    return `${captures.length} files staged`;
  }, [captures]);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setAnalyzeError(null);

    if (!displayName.trim()) {
      setAnalyzeError("Add a display name before saving.");
      return;
    }
    if (!captures?.length) {
      setAnalyzeError("Attach at least one screenshot for the timeline.");
      return;
    }

    setCreating(true);

    const createFd = new FormData();
    createFd.append("display_name", displayName.trim());
    createFd.append("name_confirmed", confirmName ? "true" : "false");

    const createOutcome = await createContact(createFd);
    if (!createOutcome.ok || !createOutcome.id) {
      setAnalyzeError(createOutcome.ok ? "Missing id." : createOutcome.error);
      setCreating(false);
      return;
    }

    const uploadFd = new FormData();
    uploadFd.append("ocr_preview", ocrPreview);
    Array.from(captures).forEach((file) => uploadFd.append("files", file));

    const uploadOutcome = await addTimelineScreenshots(createOutcome.id, uploadFd);
    if (!uploadOutcome.ok) {
      setAnalyzeError(uploadOutcome.error ?? "Screenshots upload failed.");
      setCreating(false);
      return;
    }

    router.push(`/contacts/${createOutcome.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-12" onSubmit={(ev) => void handleSubmit(ev)}>
      <section className="space-y-6 rounded-[32px] border border-zinc-100 bg-white p-8 shadow-[0_35px_80px_rgba(15,19,53,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500">Step · vision guess</p>
        <label className="block text-lg font-semibold text-zinc-900" htmlFor="smart-file">
          Drop one hero screenshot first
        </label>
        <input
          accept="image/*"
          className="w-full rounded-3xl border border-dashed border-zinc-400 px-6 py-4 text-sm font-medium text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
          id="smart-file"
          onChange={(ev) => void handleAnalyze(ev.target.files)}
          type="file"
        />
        {previewUrl ? (
          <div className="relative h-96 w-full overflow-hidden rounded-[28px] border border-white bg-zinc-900/5">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
            <img alt="" className="h-full w-full object-contain" src={previewUrl} />
          </div>
        ) : null}
        {analyzeResult ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">Vision guess</p>
            <p className="mt-4 text-xl font-semibold">
              {(analyzeResult.confidence ?? "low").toUpperCase()} · {(analyzeResult.suggested_name ?? "Unknown")}
            </p>
            {analyzeResult.preview ? <p className="mt-2 text-base text-emerald-700">{analyzeResult.preview}</p> : null}
          </div>
        ) : null}
        {analyzeError ? <div className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-950">{analyzeError}</div> : null}
      </section>

      <section className="space-y-6 rounded-[32px] border border-zinc-100 bg-white p-8 shadow-[0_35px_80px_rgba(24,31,73,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Identity fields</p>
        <label className="text-xs font-semibold uppercase tracking-[0.38em] text-zinc-500" htmlFor="display_name">
          Display name
        </label>
        <input
          className="w-full rounded-3xl border border-zinc-200 px-5 py-3 text-lg outline-none ring-amber-900/35 focus:border-amber-900 focus:ring-4"
          id="display_name"
          maxLength={120}
          onChange={(ev) => setDisplayName(ev.target.value)}
          placeholder="How you want them labeled"
          required
          type="text"
          value={displayName}
        />
        <label className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
          <input checked={confirmName} onChange={(ev) => setConfirmName(ev.target.checked)} type="checkbox" />I&apos;m
          comfortable this name is right for this thread.
        </label>
      </section>

      <section className="space-y-4 rounded-[32px] border border-zinc-100 bg-white p-8 shadow-inner shadow-zinc-100">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">Timeline bundle</p>
        <input
          accept="image/*"
          className="w-full rounded-3xl border border-dashed px-5 py-3 text-sm"
          multiple
          onChange={(ev) => setCaptures(ev.target.files)}
          required
          type="file"
        />
        <p className="text-sm text-zinc-500">{captureLabel}</p>
        <label className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500" htmlFor="ocr_preview">
          Optional preview note
        </label>
        <textarea
          className="w-full rounded-3xl border border-zinc-200 px-6 py-4 text-base leading-relaxed"
          id="ocr_preview"
          maxLength={2000}
          onChange={(ev) => setOcrPreview(ev.target.value)}
          placeholder="High-level reminder of what the screenshot shows"
          rows={4}
          value={ocrPreview}
        />
      </section>

      <button
        className="w-full rounded-full bg-zinc-900 py-4 text-white shadow-xl shadow-black/40 disabled:bg-zinc-400"
        disabled={creating}
        type="submit"
      >
        {creating ? "Sealing dossier..." : "Create contact + hydrate timeline"}
      </button>
    </form>
  );
}
