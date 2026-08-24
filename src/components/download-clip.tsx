import { useEffect, useRef, useState } from "react";
import { Download, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { t as i18n } from "@/lib/i18n";
import { renderClipVideo } from "@/lib/render-clip";
import { getSourceFile, saveSourceFile } from "@/lib/source-file";
import type { Clip, Project } from "@/lib/types";
import { downloadBlob, formatClipLength, formatTime, parseTime, slugify } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input, Label } from "./ui/field";

export function DownloadClip({
  project,
  clip,
  onClose,
  onPatchClip,
}: {
  project: Project;
  clip: Clip;
  onClose: () => void;
  onPatchClip: (patch: Partial<Clip>) => void;
}) {
  const lang = project.language;
  const c = i18n(lang);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState(0);
  const [startText, setStartText] = useState(formatTime(clip.startSec));
  const [endText, setEndText] = useState(formatTime(clip.endSec));

  const lengthSec = Math.max(1, clip.endSec - clip.startSec);

  useEffect(() => {
    let cancelled = false;
    void getSourceFile(project.id).then((saved) => {
      if (!cancelled && saved) setFile(saved);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [project.id]);

  useEffect(() => {
    setStartText(formatTime(clip.startSec));
    setEndText(formatTime(clip.endSec));
  }, [clip.startSec, clip.endSec, clip.id]);

  function commitTimes() {
    const start = parseTime(startText);
    const end = parseTime(endText);
    if (start == null || end == null || end <= start) {
      setStartText(formatTime(clip.startSec));
      setEndText(formatTime(clip.endSec));
      return;
    }
    onPatchClip({ startSec: start, endSec: Math.max(start + 8, end) });
  }

  function pickSource(): Promise<File | null> {
    const input = inputRef.current;
    if (!input) return Promise.resolve(null);
    return new Promise((resolve) => {
      const onChange = () => {
        input.removeEventListener("change", onChange);
        resolve(input.files?.[0] ?? null);
      };
      input.addEventListener("change", onChange, { once: true });
      input.click();
    });
  }

  async function renderWith(source: File) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setRatio(0);
    try {
      const result = await renderClipVideo({
        file: source,
        clip,
        aspect: project.aspect,
        style: project.captionStyle,
        canvas,
        signal: ac.signal,
        onProgress: (p) => setRatio(p.ratio),
      });
      downloadBlob(`hookcut-${slugify(clip.title)}.${result.ext}`, result.blob);
      toast(c.exported);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast(c.renderFail);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    let source = file;
    if (!source) {
      const picked = await pickSource();
      if (!picked) return;
      setFile(picked);
      await saveSourceFile(project.id, picked);
      source = picked;
    }
    await renderWith(source);
  }

  const watch =
    project.videoId &&
    `https://www.youtube.com/watch?v=${project.videoId}&t=${Math.floor(clip.startSec)}s`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-labelledby="dl-title"
        className="w-full max-w-lg rounded-t-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dl-title" className="font-display text-2xl">
          {c.downloadVideo}
        </h2>
        <p className="mt-1 text-sm text-muted">{c.downloadHint}</p>
        {!file ? (
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-fg">
            <li>{c.howDl1}</li>
            <li>{c.howDl2}</li>
            <li>{c.howDl3}</li>
          </ol>
        ) : null}
        <p className="mt-3 text-sm text-fg">
          {clip.title}
          <span className="ml-2 text-subtle tabular-nums">
            {formatTime(clip.startSec)}–{formatTime(clip.endSec)} · {formatClipLength(lengthSec, lang)}
          </span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="clip-start">{c.startTime}</Label>
            <Input
              id="clip-start"
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              onBlur={commitTimes}
              disabled={busy}
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="clip-end">{c.endTime}</Label>
            <Input
              id="clip-end"
              value={endText}
              onChange={(e) => setEndText(e.target.value)}
              onBlur={commitTimes}
              disabled={busy}
              spellCheck={false}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-subtle">{c.clipLengthHint}</p>

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/*"
          className="sr-only"
        />

        {file ? (
          <button
            type="button"
            onClick={() => {
              void pickSource().then(async (picked) => {
                if (!picked) return;
                setFile(picked);
                await saveSourceFile(project.id, picked);
              });
            }}
            disabled={busy}
            className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-md bg-raised px-3 py-3 text-left shadow-[var(--shadow-border)]"
          >
            <FolderOpen className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
            <span className="text-xs text-subtle">{c.replaceSource}</span>
          </button>
        ) : null}

        <div className="mt-4 flex justify-center">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            className="h-52 w-auto max-w-full rounded-md bg-raised shadow-[var(--shadow-border)]"
            style={{ aspectRatio: project.aspect.replace(":", "/") }}
          />
        </div>

        {busy ? (
          <div className="mt-4">
            <div className="h-1 overflow-hidden rounded-full bg-raised">
              <div className="h-full bg-fg transition-[width] duration-150" style={{ width: `${Math.round(ratio * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-subtle">
              {c.rendering} {Math.round(ratio * 100)}%
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {watch ? (
            <a
              href="https://cobalt.tools/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm text-muted hover:text-fg"
              onClick={() => {
                if (project.sourceUrl) {
                  void navigator.clipboard.writeText(project.sourceUrl).catch(() => {});
                }
              }}
            >
              {c.openDownloader}
            </a>
          ) : null}
          {watch ? (
            <a
              href={watch}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm text-muted hover:text-fg"
            >
              {c.openOnYoutube}
            </a>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button onClick={() => void run()} disabled={busy}>
            <Download className="size-4" strokeWidth={1.75} />
            {busy ? c.rendering : c.downloadClip}
          </Button>
        </div>
      </div>
    </div>
  );
}
