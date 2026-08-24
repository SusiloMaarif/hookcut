import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CreateProject } from "@/components/create-project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { t as i18n } from "@/lib/i18n";
import { useHookcut } from "@/lib/store";
import { formatTime } from "@/lib/utils";

export const Route = createFileRoute("/studio")({ component: StudioPage });

function StudioPage() {
  const lang = useHookcut((s) => s.lang);
  const projects = useHookcut((s) => s.projects);
  const c = i18n(lang);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs uppercase tracking-widest text-muted">{c.powered}</p>
        <h1 className="font-display mt-2 text-4xl tracking-tight sm:text-5xl">{c.studioTitle}</h1>
        <p className="mt-2 text-muted">{c.studioSub}</p>

        <form
          className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={c.pastePh}
            className="sm:flex-1"
          />
          <Button type="submit" className="sm:w-auto w-full">
            {c.getClips}
          </Button>
        </form>
        <p className="mt-3 text-sm text-subtle">{c.sampleHint}</p>

        <h2 className="mt-10 text-lg font-medium">
          {c.allProjects}{" "}
          <span className="text-subtle tabular-nums">({projects.length})</span>
        </h2>

        {projects.length === 0 ? (
          <p className="mt-6 text-sm text-muted">{c.empty}</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/clip/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <div className="relative aspect-video overflow-hidden bg-raised">
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg/70 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-medium leading-snug">{p.title}</h3>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-subtle tabular-nums">{formatTime(p.durationSec)}</span>
                    {p.status === "running" ? (
                      <Badge className="shimmer">{c.running}</Badge>
                    ) : (
                      <Badge>
                        {c.ready} · {p.clips.length} {c.clips}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <CreateProject open={open} onClose={() => setOpen(false)} initialUrl={url} />
    </AppShell>
  );
}
