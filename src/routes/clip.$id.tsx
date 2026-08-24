import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { PhonePreview, StylePicker } from "@/components/phone-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rewriteClipCopy, runClippingAgent } from "@/lib/ai";
import { clipPack, clipToSrt } from "@/lib/export";
import { t as i18n } from "@/lib/i18n";
import { agentClipsToClips, useHookcut } from "@/lib/store";
import type { Aspect, Project } from "@/lib/types";
import { cn, downloadText, formatTime } from "@/lib/utils";

export const Route = createFileRoute("/clip/$id")({ component: EditorPage });

function EditorPage() {
  const { id } = Route.useParams();
  const lang = useHookcut((s) => s.lang);
  const project = useHookcut((s) => s.projects.find((p) => p.id === id));
  const c = i18n(lang);

  if (!project) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="text-muted">{c.empty}</p>
        <Link to="/studio" className="text-sm text-fg underline">
          {c.back}
        </Link>
      </div>
    );
  }

  return <Editor project={project} />;
}

function Editor({ project }: { project: Project }) {
  const lang = useHookcut((s) => s.lang);
  const patchProject = useHookcut((s) => s.patchProject);
  const patchClip = useHookcut((s) => s.patchClip);
  const setClipStatus = useHookcut((s) => s.setClipStatus);
  const c = i18n(lang);

  const [activeId, setActiveId] = useState<string | undefined>(project.clips[0]?.id);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project.clips.length && !project.clips.some((x) => x.id === activeId)) {
      setActiveId(project.clips[0]?.id);
    }
  }, [project, activeId]);

  const clip = project.clips.find((x) => x.id === activeId);
  const duration = clip ? Math.max(1, clip.endSec - clip.startSec) : 12;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt / duration;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, activeId]);

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
  }, [activeId]);

  const waveform = useMemo(() => {
    const bars = 48;
    const seed = project.id.length * 17 + (clip?.startSec ?? 0);
    return Array.from({ length: bars }, (_, i) => {
      const n = Math.sin(seed * 0.3 + i * 0.55) * 0.5 + 0.5;
      return 22 + Math.round(n * 78);
    });
  }, [project.id, clip?.startSec]);

  async function retryAgent() {
    setBusy(true);
    patchProject(project.id, { status: "running", error: undefined });
    try {
      const result = await runClippingAgent({
        data: {
          title: project.title,
          durationSec: project.durationSec,
          transcript: project.transcript,
          language: project.language,
          clipCount: 5,
        },
      });
      if (!result.ok) {
        const msg = result.error === "unavailable" ? c.aiDown : c.aiErr;
        patchProject(project.id, { status: "draft", error: msg });
        toast(msg);
        return;
      }
      const clips = agentClipsToClips(result.clips, result.estimated);
      patchProject(project.id, { status: "ready", clips, error: undefined });
      setActiveId(clips[0]?.id);
    } catch {
      patchProject(project.id, { status: "draft", error: c.aiErr });
      toast(c.aiErr);
    } finally {
      setBusy(false);
    }
  }

  async function rewrite() {
    if (!clip) return;
    setBusy(true);
    try {
      const res = await rewriteClipCopy({
        data: {
          caption: clip.caption,
          hook: clip.hook,
          language: project.language,
          title: clip.title,
        },
      });
      if (!res.ok) {
        toast(res.error === "unavailable" ? c.aiDown : c.aiErr);
        return;
      }
      patchClip(project.id, clip.id, {
        hook: res.hook,
        caption: res.caption,
        keywords: res.keywords,
        title: res.title,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-3 backdrop-blur-sm sm:px-4">
        <Link
          to="/studio"
          className="inline-flex h-11 items-center gap-2 px-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">{c.back}</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{project.title}</h1>
        {project.status === "running" ? <Badge className="shimmer">{c.running}</Badge> : null}
        <div className="hidden items-center gap-1 sm:flex">
          {(["9:16", "1:1", "16:9"] as Aspect[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => patchProject(project.id, { aspect: a })}
              className={cn(
                "h-9 rounded-sm px-2.5 text-xs tabular-nums",
                project.aspect === a ? "bg-raised text-fg" : "text-muted hover:text-fg",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </header>

      {project.error || project.clips.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-raised px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-muted">{project.error || c.noClips}</p>
          <Button
            type="button"
            onClick={() => void retryAgent()}
            disabled={busy || project.status === "running"}
          >
            {busy || project.status === "running" ? c.running : c.retryAgent}
          </Button>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-5 pb-20 lg:grid-cols-12 sm:px-5">
        <aside className="order-2 lg:order-1 lg:col-span-3">
          <p className="mb-3 text-xs uppercase tracking-widest text-subtle">
            {project.clips.length} {c.clips}
          </p>
          <div className="clip-strip">
            {project.clips.length === 0 ? (
              <p className="text-sm text-muted">{c.noClips}</p>
            ) : (
              project.clips.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "rounded-lg p-3 text-left shadow-[var(--shadow-border)]",
                    item.id === activeId ? "bg-raised" : "bg-surface hover:bg-raised/70",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-subtle tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {c.score} {item.viralScore}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
                  <p className="mt-1 text-xs text-subtle tabular-nums">
                    {formatTime(item.startSec)}–{formatTime(item.endSec)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="order-1 flex flex-col items-center lg:order-2 lg:col-span-5">
          <PhonePreview
            clip={clip}
            thumbnail={project.thumbnail}
            progress={progress}
            aspect={project.aspect}
            style={project.captionStyle}
            playing={playing}
            videoId={project.videoId}
          />
          <div className="mt-5 flex w-full max-w-sm items-center gap-3">
            <button
              type="button"
              aria-label={playing ? c.pause : c.play}
              onClick={() => {
                if (progress >= 1) setProgress(0);
                setPlaying((v) => !v);
              }}
              className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg"
            >
              {playing ? (
                <Pause className="size-4" strokeWidth={1.75} />
              ) : (
                <Play className="size-4 ml-0.5" strokeWidth={1.75} />
              )}
            </button>
            <div className="flex h-10 flex-1 items-end gap-px">
              {waveform.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    backgroundColor:
                      i / waveform.length <= progress ? "var(--color-fg)" : "var(--color-raised)",
                  }}
                />
              ))}
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-subtle">
              {formatTime(progress * duration)}
            </span>
          </div>
          {clip?.estimated ? <p className="mt-3 text-xs text-subtle">{c.estimated}</p> : null}
        </section>

        <aside className="order-3 space-y-5 lg:col-span-4">
          {clip ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest text-subtle">{c.hook}</p>
                <p className="mt-1 text-base leading-snug">{clip.hook}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-subtle">{c.caption}</p>
                <textarea
                  value={clip.caption}
                  onChange={(e) => patchClip(project.id, clip.id, { caption: e.target.value })}
                  className="mt-2 min-h-24 w-full rounded-md bg-raised p-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none"
                />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-subtle">{c.style}</p>
                <StylePicker
                  value={project.captionStyle}
                  onChange={(captionStyle) => patchProject(project.id, { captionStyle })}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-subtle">{c.why}</p>
                <p className="mt-1 text-sm text-muted">{clip.why}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-subtle">{c.hashtags}</p>
                <p className="mt-1 text-sm text-muted">{clip.hashtags.join(" ")}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(clipPack(project, clip));
                    toast(c.copied);
                  }}
                >
                  {c.copyPack}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadText(
                      `${clip.title.replace(/\s+/g, "-").slice(0, 40)}.srt`,
                      clipToSrt(clip),
                    )
                  }
                >
                  <Download className="size-4" strokeWidth={1.75} />
                  {c.downloadSrt}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => {
                    const when = new Date(Date.now() + 3600_000).toISOString();
                    setClipStatus(project.id, clip.id, "queued", { scheduledAt: when });
                    toast(c.queued);
                  }}
                >
                  {clip.status === "queued" ? c.queued : c.queue}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void rewrite()}>
                  {busy ? c.running : c.rewrite}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{c.noClips}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
