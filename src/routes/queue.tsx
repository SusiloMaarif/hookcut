import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { clipPack } from "@/lib/export";
import { t as i18n } from "@/lib/i18n";
import { useHookcut } from "@/lib/store";
import type { Platform } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

export const Route = createFileRoute("/queue")({ component: QueuePage });

const PLATFORMS: Platform[] = ["tiktok", "shorts", "reels", "x", "linkedin"];

function QueuePage() {
  const lang = useHookcut((s) => s.lang);
  const projects = useHookcut((s) => s.projects);
  const patchClip = useHookcut((s) => s.patchClip);
  const setClipStatus = useHookcut((s) => s.setClipStatus);
  const c = i18n(lang);

  const rows = projects.flatMap((project) =>
    project.clips
      .filter((clip) => clip.status === "queued")
      .map((clip) => ({ project, clip })),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-4xl tracking-tight">{c.queueTitle}</h1>
        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted">{c.queueEmpty}</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {rows.map(({ project, clip }) => (
              <li
                key={`${project.id}-${clip.id}`}
                className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5"
              >
                <div className="flex gap-4">
                  <img
                    src={project.thumbnail}
                    alt=""
                    className="size-16 shrink-0 rounded-md object-cover sm:size-20"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/clip/$id"
                      params={{ id: project.id }}
                      className="text-sm text-muted hover:text-fg"
                    >
                      {project.title}
                    </Link>
                    <h2 className="mt-0.5 text-base font-medium leading-snug">{clip.title}</h2>
                    <p className="mt-1 text-xs text-subtle tabular-nums">
                      {formatTime(clip.startSec)}–{formatTime(clip.endSec)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted">{clip.hook}</p>
                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-widest text-subtle">{c.platform}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map((p) => {
                      const on = clip.platforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            const next = on
                              ? clip.platforms.filter((x) => x !== p)
                              : [...clip.platforms, p];
                            patchClip(project.id, clip.id, { platforms: next });
                          }}
                          className={cn(
                            "h-9 rounded-full px-3 text-xs capitalize",
                            on ? "bg-accent text-accent-fg" : "bg-raised text-muted",
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs uppercase tracking-widest text-subtle">
                    {c.when}
                  </span>
                  <input
                    type="datetime-local"
                    className="h-11 w-full rounded-md bg-raised px-3 text-sm text-fg shadow-[var(--shadow-border)]"
                    value={toLocal(clip.scheduledAt)}
                    onChange={(e) =>
                      patchClip(project.id, clip.id, {
                        scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      })
                    }
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(clipPack(project, clip));
                      toast(c.copied);
                    }}
                  >
                    {c.copyPack}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setClipStatus(project.id, clip.id, "ready", { scheduledAt: undefined })}
                  >
                    {c.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function toLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
