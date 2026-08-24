import { createServerFn } from "@tanstack/react-start";
import { parseYoutubeId } from "./utils";

type Track = { baseUrl?: string; languageCode?: string; kind?: string; vssId?: string };

function extractJsonArray(html: string, key: string): Track[] {
  const needle = `"${key}":`;
  const i = html.indexOf(needle);
  if (i < 0) return [];
  const start = html.indexOf("[", i);
  if (start < 0) return [];
  let depth = 0;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, j + 1)) as Track[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

function pickTrack(tracks: Track[], lang: string): Track | undefined {
  const want = lang === "id" ? ["id", "en"] : ["en", "id"];
  for (const code of want) {
    const exact = tracks.find((t) => t.languageCode === code && t.kind !== "asr");
    if (exact) return exact;
  }
  for (const code of want) {
    const asr = tracks.find((t) => t.languageCode === code);
    if (asr) return asr;
  }
  return tracks[0];
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function json3ToTranscript(json: {
  events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[];
}): { transcript: string; lastMs: number } {
  const lines: string[] = [];
  let lastMs = 0;
  for (const ev of json.events ?? []) {
    const text = (ev.segs ?? [])
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .trim();
    if (!text || text === "\n") continue;
    const start = ev.tStartMs ?? 0;
    lastMs = Math.max(lastMs, start + (ev.dDurationMs ?? 0));
    lines.push(`[${formatTime(start)}] ${text}`);
  }
  return { transcript: lines.join("\n"), lastMs };
}

async function scrapeWatch(id: string) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    },
  });
  if (!res.ok) return "";
  return res.text();
}

function lengthFromHtml(html: string): number | undefined {
  const m = html.match(/"lengthSeconds":"(\d+)"/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const fetchYoutubeSource = createServerFn({ method: "POST" })
  .validator((input: { url: string; language?: "id" | "en" }) => input)
  .handler(async ({ data }) => {
    const id = parseYoutubeId(data.url);
    if (!id) return { ok: false as const, error: "invalid" };

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
    let title = `YouTube ${id}`;
    let thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    let author = "";
    try {
      const metaRes = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
      if (metaRes.ok) {
        const body = (await metaRes.json()) as {
          title?: string;
          thumbnail_url?: string;
          author_name?: string;
        };
        title = body.title || title;
        thumbnail = body.thumbnail_url || thumbnail;
        author = body.author_name || "";
      }
    } catch {
      /* oembed optional */
    }

    let transcript = "";
    let durationSec: number | undefined;
    try {
      const html = await scrapeWatch(id);
      durationSec = lengthFromHtml(html);
      const tracks = extractJsonArray(html, "captionTracks");
      const track = pickTrack(tracks, data.language ?? "en");
      if (track?.baseUrl) {
        const timed = new URL(track.baseUrl);
        timed.searchParams.set("fmt", "json3");
        const capRes = await fetch(timed.toString(), {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (capRes.ok) {
          const json = (await capRes.json()) as {
            events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[];
          };
          const parsed = json3ToTranscript(json);
          transcript = parsed.transcript.slice(0, 12000);
          if (!durationSec && parsed.lastMs) durationSec = Math.ceil(parsed.lastMs / 1000);
        }
      }
    } catch {
      /* captions optional */
    }

    return {
      ok: true as const,
      videoId: id,
      title,
      thumbnail,
      author,
      transcript,
      durationSec,
    };
  });
