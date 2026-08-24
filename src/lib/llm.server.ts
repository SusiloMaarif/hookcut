import { bakedLlm } from "virtual:hookcut-llm-env";
import type { AgentClip, Lang } from "./types";

export type ClipJobInput = {
  title: string;
  durationSec: number;
  transcript: string;
  language: Lang;
  clipCount: number;
};

const FALLBACK_KEY = "sk-mdfk-zl0WzaCXP6NccD1wtba7h2sixJEgSauzW3iFUJWpB2R";
/** Per-model cap. Models run in parallel; the first valid JSON wins. */
const LLM_TIMEOUT_MS = 28_000;

function llmConfig() {
  const madefaka =
    process.env.MADEFAKA_API_KEY ||
    process.env.NITRO_MADEFAKA_API_KEY ||
    bakedLlm.apiKey ||
    FALLBACK_KEY;
  if (madefaka) {
    return {
      apiKey: madefaka,
      baseUrl: (
        process.env.MADEFAKA_BASE_URL ||
        process.env.NITRO_MADEFAKA_BASE_URL ||
        bakedLlm.baseUrl ||
        "https://madefaka.my.id/v1"
      ).replace(/\/$/, ""),
      model:
        process.env.MADEFAKA_MODEL ||
        process.env.NITRO_MADEFAKA_MODEL ||
        bakedLlm.model ||
        "deepseek-v4-flash:free",
      fallbackModel: "mimo-v2.5:free" as string | undefined,
    };
  }
  const xai = process.env.XAI_API_KEY;
  if (xai) {
    return {
      apiKey: xai,
      baseUrl: "https://api.x.ai/v1",
      model: "grok-4.5",
      fallbackModel: undefined as string | undefined,
    };
  }
  return null;
}

function parseClips(text: string): AgentClip[] {
  const raw = text.trim();
  const fenced = raw.match(/\{[\s\S]*\}/);
  const json = JSON.parse(fenced ? fenced[0] : raw) as { clips?: AgentClip[] };
  const clips = Array.isArray(json.clips) ? json.clips : [];
  return clips.filter((c) => c && typeof c.caption === "string" && typeof c.startSec === "number");
}

function messageText(body: {
  choices?: { message?: { content?: string | null; reasoning_content?: string } }[];
}): string {
  const msg = body.choices?.[0]?.message;
  const content = (msg?.content ?? "").trim();
  if (content) return content;
  const reasoning = (msg?.reasoning_content ?? "").trim();
  const fromReason = reasoning.match(/\{[\s\S]*\}/);
  return fromReason ? fromReason[0] : "";
}

async function tryModel(
  cfg: NonNullable<ReturnType<typeof llmConfig>>,
  model: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.5,
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        reasoning: { effort: "none" },
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, error: `API error ${res.status}` };
    const body = (await res.json()) as {
      choices?: { message?: { content?: string | null; reasoning_content?: string } }[];
    };
    const text = messageText(body);
    if (text) return { ok: true, text };
    return { ok: false, error: "empty" };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { ok: false, error: timedOut ? "empty" : "network" };
  }
}

async function complete(
  cfg: NonNullable<ReturnType<typeof llmConfig>>,
  messages: { role: string; content: string }[],
  maxTokens: number,
) {
  const models = [cfg.model, cfg.fallbackModel].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i) as string[];
  try {
    return await Promise.any(
      models.map(async (model) => {
        const result = await tryModel(cfg, model, messages, maxTokens);
        if (!result.ok) throw new Error(result.error);
        return result;
      }),
    );
  } catch {
    return { ok: false as const, error: "empty" };
  }
}

export async function runClipJob(data: ClipJobInput) {
  const cfg = llmConfig();
  if (!cfg) return { ok: false as const, error: "unavailable" };

  const count = Math.min(8, Math.max(3, Math.round(data.clipCount || 5)));
  const transcript = (data.transcript || "").slice(0, 4000);
  const langName = data.language === "id" ? "Indonesian" : "English";
  const estimated = transcript.trim().length < 80;
  const durationSec = Math.max(30, data.durationSec);

  const system = `You are Hookcut's clipping director for TikTok, Reels, and Shorts.
Pick the strongest ${count} moments from a long-form video.
Rules:
- Each clip 20-35 seconds (TikTok/Reels sweet spot, never over 45). startSec/endSec must fall inside 0..${durationSec}.
- Prefer: a claim, a number, a punchline, a framework, an insult to the status quo.
- Hook is the spoken first line, max 12 words.
- Caption is 6–14 words, ALL CAPS is ok, line-broken with spaces so it can wrap 2–3 lines. Include 1–3 keywords to highlight.
- viralScore 70–97. why is one blunt sentence.
- 3–5 hashtags, no spaces in tags.
- Write ALL text (hook, title, caption, why, hashtags) in ${langName}.
- If the transcript is thin, still invent plausible director's cuts and keep timestamps spaced through the duration.
Return JSON only: {"clips":[{startSec,endSec,hook,title,caption,keywords,viralScore,why,hashtags}]}`;

  const user = `Title: ${data.title}
Duration seconds: ${durationSec}
Transcript or notes:
${transcript || "(none — plan estimated cuts from the title alone)"}`;

  const result = await complete(
    cfg,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    1200,
  );
  if (!result.ok) return result;
  try {
    const clips = parseClips(result.text).slice(0, count);
    if (!clips.length) return { ok: false as const, error: "empty" };
    return { ok: true as const, clips, estimated };
  } catch {
    return { ok: false as const, error: "parse" };
  }
}

export async function rewriteJob(data: {
  caption: string;
  hook: string;
  language: Lang;
  title: string;
}) {
  const cfg = llmConfig();
  if (!cfg) return { ok: false as const, error: "unavailable" };

  const langName = data.language === "id" ? "Indonesian" : "English";
  const result = await complete(
    cfg,
    [
      {
        role: "system",
        content: `Rewrite short-form clip copy in ${langName}. Return JSON {hook, caption, keywords, title}. Caption 6–14 words, punchy. Hook max 12 words.`,
      },
      {
        role: "user",
        content: `Title: ${data.title}\nHook: ${data.hook}\nCaption: ${data.caption}`,
      },
    ],
    400,
  );
  if (!result.ok) return result;
  try {
    const parsed = JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as {
      hook?: string;
      caption?: string;
      keywords?: string[];
      title?: string;
    };
    return {
      ok: true as const,
      hook: parsed.hook ?? data.hook,
      caption: parsed.caption ?? data.caption,
      keywords: parsed.keywords ?? [],
      title: parsed.title ?? data.title,
    };
  } catch {
    return { ok: false as const, error: "parse" };
  }
}
