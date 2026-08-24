import type { Aspect, CaptionStyle, Clip } from "./types";

export type RenderProgress = { ratio: number; current: number; total: number };

function captionWords(caption: string) {
  return caption.trim().split(/\s+/).filter(Boolean);
}

function token(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function frameSize(aspect: Aspect) {
  if (aspect === "9:16") return { w: 1080, h: 1920 };
  if (aspect === "1:1") return { w: 1080, h: 1080 };
  return { w: 1920, h: 1080 };
}

export function pickRecorderMime(): { mime: string; ext: "mp4" | "webm" } {
  const candidates: { mime: string; ext: "mp4" | "webm" }[] = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  if (typeof MediaRecorder === "undefined") return candidates[2];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? candidates[4];
}

function isKeyword(word: string, keywords: string[]) {
  const n = word.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!n) return false;
  return keywords.some((k) => {
    const kn = k.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return kn === n || kn.includes(n) || n.includes(kn);
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dw: number,
  dh: number,
) {
  const vw = video.videoWidth || dw;
  const vh = video.videoHeight || dh;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  words: string[],
  maxWidth: number,
  padX: number,
  gap: number,
) {
  const lines: string[][] = [];
  let line: string[] = [];
  for (const word of words) {
    const trial = [...line, word];
    const width = trial.reduce((sum, w, i) => sum + ctx.measureText(w).width + padX * 2 + (i ? gap : 0), 0);
    if (width > maxWidth && line.length) {
      lines.push(line);
      line = [word];
    } else {
      line = trial;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

export function drawCaption(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  progress: number,
  style: CaptionStyle,
  w: number,
  h: number,
) {
  const words = captionWords(clip.caption);
  if (!words.length) return;
  const idx = Math.min(words.length - 1, Math.max(0, Math.floor(progress * words.length)));
  const shown = style === "minimal" ? words : words.slice(0, idx + 1);
  if (!shown.length) return;

  const fontSize = Math.round(w * 0.056);
  ctx.font = `600 ${fontSize}px "IBM Plex Sans", "Segoe UI", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const padX = Math.round(fontSize * 0.28);
  const padY = Math.round(fontSize * 0.2);
  const gap = Math.round(fontSize * 0.16);
  const lineGap = Math.round(fontSize * 0.22);
  const maxWidth = w * 0.86;
  const lines = wrapLines(ctx, shown, maxWidth, padX, gap);
  const boxH = fontSize + padY * 2;
  const blockH = lines.length * boxH + (lines.length - 1) * lineGap;
  let y = h * 0.78 - blockH / 2;

  const fg = token("--color-fg", "#f3f1ea");
  const bg = token("--color-bg", "#0a0a0b");
  const hit = token("--color-hit", "#d4f26a");
  const hitFg = token("--color-hit-fg", "#12140a");

  let cursor = 0;
  for (const line of lines) {
    const widths = line.map((word) => ctx.measureText(word).width + padX * 2);
    const lineW = widths.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
    let x = (w - lineW) / 2;
    line.forEach((word, i) => {
      const wordIndex = cursor;
      cursor += 1;
      const active = wordIndex === idx;
      const hot = isKeyword(word, clip.keywords);
      const boxW = widths[i];
      const cy = y + boxH / 2;

      if (style === "hormozi" || style === "box") {
        ctx.fillStyle = style === "hormozi" && (active || hot) ? hit : fg;
        roundRect(ctx, x, y, boxW, boxH, 6);
        ctx.fill();
        ctx.fillStyle = style === "hormozi" && (active || hot) ? hitFg : bg;
        ctx.fillText(word, x + padX, cy);
      } else if (style === "highlight") {
        if (active || hot) {
          ctx.fillStyle = hit;
          roundRect(ctx, x, y, boxW, boxH, 6);
          ctx.fill();
          ctx.fillStyle = hitFg;
        } else {
          ctx.fillStyle = fg;
        }
        ctx.fillText(word, x + padX, cy);
      } else if (style === "glow") {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = fg;
        ctx.fillText(word, x + padX, cy);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = fg;
        if (active && style === "scale") ctx.font = `700 ${Math.round(fontSize * 1.08)}px "IBM Plex Sans", sans-serif`;
        ctx.fillText(word, x + padX, cy);
        ctx.font = `600 ${fontSize}px "IBM Plex Sans", sans-serif`;
      }
      x += boxW + gap;
    });
    y += boxH + lineGap;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function waitEvent(target: EventTarget, event: string) {
  return new Promise<void>((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(event));
    };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
    };
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
  });
}

export async function renderClipVideo(opts: {
  file: File;
  clip: Clip;
  aspect: Aspect;
  style: CaptionStyle;
  canvas: HTMLCanvasElement;
  signal?: AbortSignal;
  onProgress?: (p: RenderProgress) => void;
}): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  const { file, clip, aspect, style, canvas, signal, onProgress } = opts;
  const { w, h } = frameSize(aspect);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  await document.fonts.ready.catch(() => undefined);

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.preload = "auto";
  video.muted = false;
  video.volume = 1;
  video.style.position = "fixed";
  video.style.left = "0";
  video.style.bottom = "0";
  video.style.width = "160px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.setAttribute("playsinline", "");
  document.body.appendChild(video);

  const cleanup = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  };

  try {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await waitEvent(video, "loadedmetadata");
    const start = Math.min(clip.startSec, Math.max(0, video.duration - 1));
    const end = Math.min(Math.max(start + 1, clip.endSec), video.duration || clip.endSec);
    const total = Math.max(1, end - start);
    video.currentTime = start;
    await waitEvent(video, "seeked");

    const canvasStream = canvas.captureStream(30);
    let audioTracks: MediaStreamTrack[] = [];
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioCtx();
      await audioCtx.resume();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      audioTracks = dest.stream.getAudioTracks();
    } catch {
      audioCtx = null;
      const streamFn =
        (
          video as HTMLVideoElement & {
            captureStream?: () => MediaStream;
            mozCaptureStream?: () => MediaStream;
          }
        ).captureStream ||
        (video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream;
      if (streamFn) {
        try {
          audioTracks = streamFn.call(video).getAudioTracks();
        } catch {
          audioTracks = [];
        }
      }
    }

    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks.filter((t) => t.readyState === "live"),
    ]);
    const picked = pickRecorderMime();
    const rec = new MediaRecorder(combined, {
      mimeType: picked.mime,
      videoBitsPerSecond: 5_000_000,
    });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const stopped = new Promise<Blob>((resolve, reject) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: picked.mime }));
      rec.onerror = () => reject(new Error("recorder"));
    });

    await video.play();
    rec.start(120);

    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        video.pause();
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });

      const tick = () => {
        if (signal?.aborted) return;
        const t = video.currentTime;
        const ratio = Math.min(1, Math.max(0, (t - start) / total));
        drawCover(ctx, video, w, h);
        const fade = ctx.createLinearGradient(0, h * 0.55, 0, h);
        fade.addColorStop(0, "rgba(10,10,11,0)");
        fade.addColorStop(1, "rgba(10,10,11,0.72)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, h * 0.55, w, h * 0.45);
        drawCaption(ctx, clip, ratio, style, w, h);
        onProgress?.({ ratio, current: t - start, total });
        if (t >= end - 0.04 || video.ended) {
          signal?.removeEventListener("abort", abort);
          video.pause();
          if (rec.state !== "inactive") rec.stop();
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    const blob = await stopped;
    if (!blob.size) throw new Error("empty");
    void audioCtx?.close();
    return { blob, ext: picked.ext };
  } finally {
    cleanup();
  }
}
