import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clapperboard, Captions, ListTodo } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { PhonePreview } from "@/components/phone-preview";
import { t as i18n } from "@/lib/i18n";
import { SAMPLES } from "@/lib/samples";
import { useHookcut } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const lang = useHookcut((s) => s.lang);
  const c = i18n(lang);
  const demo = SAMPLES[0];
  const clips = demo.clips.slice(0, 3);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteNav />

      <main>
        <section className="relative px-4 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs uppercase tracking-widest text-muted">{c.powered}</p>
            <h1 className="font-display mt-4 max-w-3xl text-4xl leading-[1.1] tracking-tight sm:text-6xl">
              {c.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">{c.heroBody}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/studio"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                {c.openStudio}
                <ArrowRight className="size-4" strokeWidth={1.75} />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center px-4 text-sm text-muted hover:text-fg"
              >
                {c.seeHow}
              </a>
            </div>
            <p className="mt-8 max-w-2xl text-sm text-subtle">{c.honest}</p>
          </div>

          <div className="mx-auto mt-14 flex max-w-6xl items-end justify-center gap-3 overflow-x-auto px-2 pb-24 sm:gap-5">
            {clips.map((clip, i) => (
              <div
                key={clip.id}
                className={i === 1 ? "hidden sm:block" : undefined}
                style={{ transform: i === 1 ? "translateY(-12px)" : undefined }}
              >
                <PhonePreview
                  clip={clip}
                  thumbnail={i === 2 ? "/media/comedy.jpg" : i === 1 ? "/media/rooftop.jpg" : demo.thumbnail}
                  progress={0.7}
                  aspect="9:16"
                  style={i === 0 ? "hormozi" : i === 1 ? "box" : "glow"}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
            {[
              { icon: Clapperboard, t: c.featAgent, d: c.featAgentD },
              { icon: Captions, t: c.featCap, d: c.featCapD },
              { icon: ListTodo, t: c.featQueue, d: c.featQueueD },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]">
                <f.icon className="size-5 text-muted" strokeWidth={1.6} />
                <h2 className="mt-4 text-lg font-medium">{f.t}</h2>
                <p className="mt-2 text-sm text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">{c.seeHow}</p>
              <ol className="mt-8 space-y-8">
                {[
                  { n: "01", t: c.step1t, d: c.step1d },
                  { n: "02", t: c.step2t, d: c.step2d },
                  { n: "03", t: c.step3t, d: c.step3d },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="font-display text-2xl text-subtle tabular-nums">{s.n}</span>
                    <div>
                      <h3 className="text-lg font-medium">{s.t}</h3>
                      <p className="mt-1 text-sm text-muted">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
              <img
                src="/media/studio.jpg"
                alt=""
                className="aspect-video w-full object-cover"
              />
              <div className="p-5">
                <p className="text-sm text-muted">{c.vugolaNote}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-lg">
              Hook<span className="italic">cut</span>
            </span>
            <p className="text-sm text-subtle">{c.footer}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
