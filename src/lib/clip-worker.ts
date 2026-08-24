const STORAGE_KEY = "hookcut-worker-url";

export function getWorkerUrl() {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved?.trim()) return saved.trim().replace(/\/$/, "");
  }
  const env = (import.meta.env.VITE_CLIP_WORKER_URL as string | undefined) || "";
  return env.replace(/\/$/, "");
}

export function setWorkerUrl(url: string) {
  if (typeof window === "undefined") return;
  const clean = url.trim().replace(/\/$/, "");
  if (clean) window.localStorage.setItem(STORAGE_KEY, clean);
  else window.localStorage.removeItem(STORAGE_KEY);
}

export async function fetchClipFromWorker(opts: {
  workerUrl: string;
  url: string;
  startSec: number;
  endSec: number;
  signal?: AbortSignal;
}) {
  const res = await fetch(`${opts.workerUrl}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: opts.url,
      startSec: opts.startSec,
      endSec: opts.endSec,
    }),
    signal: opts.signal,
  });
  const type = res.headers.get("content-type") || "";
  if (!res.ok) {
    let error = `worker ${res.status}`;
    if (type.includes("json")) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) error = body.error;
    }
    throw new Error(error);
  }
  if (type.includes("json")) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "worker");
  }
  const blob = await res.blob();
  if (blob.size < 1000) throw new Error("empty");
  const ext = type.includes("webm") ? "webm" : "mp4";
  return new File([blob], `hookcut-source.${ext}`, { type: type || "video/mp4" });
}
