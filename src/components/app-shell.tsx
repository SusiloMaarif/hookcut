import { Link, useRouterState } from "@tanstack/react-router";
import { Clapperboard, ListTodo } from "lucide-react";
import { t as i18n } from "@/lib/i18n";
import { useHookcut } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Wordmark } from "./site-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const lang = useHookcut((s) => s.lang);
  const setLang = useHookcut((s) => s.setLang);
  const c = i18n(lang);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queued = useHookcut((s) => s.projects.flatMap((p) => p.clips).filter((x) => x.status === "queued").length);

  const items = [
    { to: "/studio" as const, label: c.navStudio, icon: Clapperboard, match: (p: string) => p.startsWith("/studio") },
    { to: "/queue" as const, label: c.navQueue, icon: ListTodo, match: (p: string) => p.startsWith("/queue") },
  ];

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-52 flex-col border-r border-border bg-surface px-4 py-5">
        <Wordmark />
        <p className="mt-6 mb-2 px-2 text-xs uppercase tracking-widest text-subtle">Create</p>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm",
                  active ? "bg-raised text-fg" : "text-muted hover:text-fg hover:bg-raised/60",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {item.to === "/queue" && queued > 0 ? (
                  <span className="tabular-nums text-xs text-subtle">{queued}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            className="h-11 px-3 text-xs tracking-wide text-muted hover:text-fg"
          >
            {c.lang}
          </button>
        </div>
      </aside>

      <div className="pb-16 md:pl-52">
        <div className="md:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-sm">
          <Wordmark />
          <div className="flex gap-1">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex h-11 items-center px-2 text-sm",
                  item.match(pathname) ? "text-fg" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
