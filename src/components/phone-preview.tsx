import type { Aspect, CaptionStyle, Clip } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: CaptionStyle[] = ["hormozi", "box", "glow", "scale", "minimal", "highlight"];

export function captionWords(caption: string) {
  return caption
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isKeyword(word: string, keywords: string[]) {
  const n = word.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return keywords.some((k) => k.replace(/[^A-Za-z0-9]/g, "").toUpperCase() === n || k.toUpperCase().includes(n));
}

export function CaptionLayer({
  clip,
  progress,
  style,
}: {
  clip: Clip;
  progress: number;
  style: CaptionStyle;
}) {
  const words = captionWords(clip.caption);
  const idx = Math.min(words.length - 1, Math.max(0, Math.floor(progress * words.length)));
  const shown = style === "minimal" ? words : words.slice(0, idx + 1);
  const recent = shown.slice(-6);

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-16 flex justify-center">
      <p
        className={cn(
          "max-w-xs text-center font-semibold leading-tight tracking-tight",
          style === "minimal" && "text-xs uppercase text-fg/80",
          style !== "minimal" && "text-sm sm:text-base",
        )}
      >
        {recent.map((w, i) => {
          const abs = words.length - recent.length + i;
          const active = abs === idx;
          const hit = isKeyword(w, clip.keywords);
          return (
            <Word
              key={`${w}-${i}`}
              word={w}
              active={active}
              hit={hit}
              styleName={style}
            />
          );
        })}
      </p>
    </div>
  );
}

function Word({
  word,
  active,
  hit,
  styleName,
}: {
  word: string;
  active: boolean;
  hit: boolean;
  styleName: CaptionStyle;
}) {
  if (styleName === "hormozi") {
    return (
      <span
        className={cn(
          "mr-1 inline-block px-1 py-0.5",
          active || hit ? "bg-hit text-hit-fg" : "bg-fg text-bg",
          active && "word-pop",
        )}
      >
        {word}
      </span>
    );
  }
  if (styleName === "box") {
    return (
      <span className={cn("mr-1 inline-block bg-fg px-1 py-0.5 text-bg", active && "word-pop")}>{word}</span>
    );
  }
  if (styleName === "highlight") {
    return (
      <span
        className={cn(
          "mr-1 inline-block",
          active || hit ? "bg-hit px-1 text-hit-fg" : "text-fg",
          active && "word-pop",
        )}
      >
        {word}
      </span>
    );
  }
  if (styleName === "glow") {
    return (
      <span
        className={cn(
          "mr-1 inline-block text-fg",
          active && "word-pop scale-105",
        )}
        style={{ textShadow: "0 2px 12px rgb(0 0 0 / 80%), 0 0 2px rgb(0 0 0 / 90%)" }}
      >
        {word}
      </span>
    );
  }
  if (styleName === "scale") {
    return (
      <span className={cn("mr-1 inline-block text-fg", active && "word-pop scale-110")}>{word}</span>
    );
  }
  return <span className="mr-1 inline-block">{word}</span>;
}

export function PhonePreview({
  clip,
  thumbnail,
  progress,
  aspect,
  style,
  playing,
  videoId,
}: {
  clip: Clip | undefined;
  thumbnail: string;
  progress: number;
  aspect: Aspect;
  style: CaptionStyle;
  playing?: boolean;
  videoId?: string;
}) {
  const frame =
    aspect === "9:16"
      ? "aspect-[9/16] w-56 sm:w-64"
      : aspect === "1:1"
        ? "aspect-square w-60 sm:w-72"
        : "aspect-video w-72 sm:w-96";

  const start = clip ? Math.floor(clip.startSec) : 0;
  const end = clip ? Math.floor(clip.endSec) : start + 20;
  const embed =
    videoId &&
    `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}&end=${end}&autoplay=${playing ? 1 : 0}&mute=${playing ? 1 : 1}&rel=0&modestbranding=1&controls=0&playsinline=1`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-raised shadow-[var(--shadow-border)]",
        frame,
      )}
    >
      {embed ? (
        <iframe
          key={`${videoId}-${start}-${playing ? "p" : "s"}`}
          title="source"
          src={embed}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[177%] w-[177%] -translate-x-1/2 -translate-y-1/2 border-0"
          allow="autoplay; encrypted-media"
        />
      ) : (
        <img
          src={thumbnail}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover",
            playing && "scale-[1.03] transition-transform duration-500",
          )}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/10 to-bg/20" />
      {clip ? <CaptionLayer clip={clip} progress={progress} style={style} /> : null}
    </div>
  );
}

export function StylePicker({
  value,
  onChange,
}: {
  value: CaptionStyle;
  onChange: (s: CaptionStyle) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STYLES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "h-11 rounded-md text-xs capitalize tracking-wide",
            value === s ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
