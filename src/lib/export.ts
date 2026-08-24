import type { Clip, Project } from "./types";
import { formatSrtTime, formatTime } from "./utils";

export function clipToSrt(clip: Clip): string {
  const words = clip.caption.trim().split(/\s+/).filter(Boolean);
  const dur = Math.max(1, clip.endSec - clip.startSec);
  if (words.length === 0) {
    return `1\n${formatSrtTime(0)} --> ${formatSrtTime(dur)}\n${clip.hook}\n`;
  }
  const chunk = 3;
  const lines: string[] = [];
  let n = 1;
  for (let i = 0; i < words.length; i += chunk) {
    const slice = words.slice(i, i + chunk);
    const t0 = (i / words.length) * dur;
    const t1 = (Math.min(words.length, i + chunk) / words.length) * dur;
    lines.push(`${n}\n${formatSrtTime(t0)} --> ${formatSrtTime(t1)}\n${slice.join(" ")}\n`);
    n += 1;
  }
  return lines.join("\n");
}

export function projectToSrt(project: Project): string {
  return project.clips
    .map((clip, i) => {
      const body = clipToSrt(clip)
        .split("\n")
        .map((line) => line)
        .join("\n");
      return `${i + 1} — ${clip.title} (${formatTime(clip.startSec)}–${formatTime(clip.endSec)})\n${body}`;
    })
    .join("\n\n");
}

export function clipPack(project: Project, clip: Clip): string {
  return [
    `TITLE: ${clip.title}`,
    `HOOK: ${clip.hook}`,
    `CAPTION:\n${clip.caption}`,
    `HASHTAGS: ${clip.hashtags.join(" ")}`,
    `TIMESTAMP: ${formatTime(clip.startSec)}–${formatTime(clip.endSec)}`,
    `SCORE: ${clip.viralScore}`,
    `WHY: ${clip.why}`,
    project.videoId
      ? `WATCH: https://www.youtube.com/watch?v=${project.videoId}&t=${Math.floor(clip.startSec)}s`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
