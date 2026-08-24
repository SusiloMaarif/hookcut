import { Link } from "@tanstack/react-router";
import { t as i18n } from "@/lib/i18n";
import { useHookcut } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Wordmark() {
  return (
    <Link to="/" className="flex min-h-11 items-center">
      <span className="font-display text-xl tracking-tight text-fg">
        Hook<span className="italic">cut</span>
      </span>
    </Link>
  );
}

export function SiteNav({
  variant = "overlay",
}: {
  variant?: "overlay" | "solid";
}) {
  const lang = useHookcut((s) => s.lang);
  const setLang = useHookcut((s) => s.setLang);
  const c = i18n(lang);

  return (
    <header
      className={cn(
        "z-30",
        variant === "solid"
          ? "sticky top-0 border-b border-border bg-bg/90 backdrop-blur-sm"
          : "absolute inset-x-0 top-0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-1">
          <Link
            to="/studio"
            className="hidden sm:inline-flex h-11 items-center px-3 text-sm text-muted hover:text-fg"
          >
            {c.navStudio}
          </Link>
          <Link
            to="/queue"
            className="hidden sm:inline-flex h-11 items-center px-3 text-sm text-muted hover:text-fg"
          >
            {c.navQueue}
          </Link>
          <button
            type="button"
            className="h-11 px-3 text-xs tracking-wide text-muted hover:text-fg"
            onClick={() => setLang(lang === "id" ? "en" : "id")}
          >
            {c.lang}
          </button>
          <Link
            to="/studio"
            className="ml-1 inline-flex h-9 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            {c.openStudio}
          </Link>
        </nav>
      </div>
    </header>
  );
}
