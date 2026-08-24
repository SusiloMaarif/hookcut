import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT || 8080);
const KEY = process.env.HOOKCUT_WORKER_KEY || "";
const MAX_CLIP_SEC = 90;
const JOB_MS = 240_000;

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  const type =
    headers["Content-Type"] ||
    (typeof body === "object" && !Buffer.isBuffer(body) ? "application/json" : "text/plain");
  res.writeHead(status, { "Content-Type": type, ...headers });
  res.end(payload);
}

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-hookcut-key");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function youtubeUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    const host = u.hostname.replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("timeout"));
    }, opts.timeout || JOB_MS);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else reject(new Error((err || out || `exit ${code}`).slice(-1200)));
    });
  });
}

function findMedia(dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.(mp4|webm|mkv|m4a|mov)$/i.test(f));
  files.sort((a, b) => fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size);
  return files[0] ? path.join(dir, files[0]) : null;
}

function fmtSection(start, end) {
  const s = Math.max(0, start);
  const e = Math.max(s + 1, end);
  const stamp = (n) => {
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const sec = (n % 60).toFixed(2).padStart(5, "0");
    return `${h}:${String(m).padStart(2, "0")}:${sec}`;
  };
  return `*${stamp(s)}-${stamp(e)}`;
}

async function cutClip({ url, startSec, endSec }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hookcut-"));
  const cookiesPath = process.env.YTDLP_COOKIES_FILE;
  const cookiesValue = process.env.YTDLP_COOKIES;
  let cookieFile = cookiesPath;
  if (!cookieFile && cookiesValue) {
    cookieFile = path.join(dir, "cookies.txt");
    fs.writeFileSync(cookieFile, cookiesValue);
  }
  const base = [
    "--no-playlist",
    "--no-progress",
    "--geo-bypass",
    "--newline",
    "--ignore-config",
    "--extractor-args",
    "youtube:player_client=android,ios,tv,web",
    "-f",
    "18/b[ext=mp4][height<=720]/bv*[height<=720]+ba/b",
    "--merge-output-format",
    "mp4",
    "--max-filesize",
    "80M",
    "-o",
    path.join(dir, "src.%(ext)s"),
  ];
  if (cookieFile && fs.existsSync(cookieFile)) base.push("--cookies", cookieFile);

  try {
    await run("yt-dlp", [...base, "--download-sections", fmtSection(startSec, endSec), "--force-keyframes-at-cuts", url]);
    let media = findMedia(dir);
    if (!media) {
      await run("yt-dlp", [...base, url]);
      media = findMedia(dir);
      if (!media) throw new Error("no-file");
      const trimmed = path.join(dir, "clip.mp4");
      await run("ffmpeg", [
        "-y",
        "-ss",
        String(startSec),
        "-i",
        media,
        "-t",
        String(Math.min(MAX_CLIP_SEC, endSec - startSec)),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        trimmed,
      ]);
      media = trimmed;
    }
    const buf = fs.readFileSync(media);
    if (buf.length < 1000) throw new Error("empty");
    return buf;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function authorized(req) {
  if (!KEY) return true;
  return req.headers["x-hookcut-key"] === KEY;
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    send(res, 200, { ok: true });
    return;
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/render") {
    if (!authorized(req)) {
      send(res, 401, { ok: false, error: "key" });
      return;
    }
    try {
      const body = req.method === "POST" ? await readJson(req) : {};
      const video = youtubeUrl(body.url || url.searchParams.get("url"));
      const startSec = Number(body.startSec ?? url.searchParams.get("startSec") ?? 0);
      const endSec = Number(body.endSec ?? url.searchParams.get("endSec") ?? startSec + 30);
      if (!video) {
        send(res, 400, { ok: false, error: "url" });
        return;
      }
      if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
        send(res, 400, { ok: false, error: "range" });
        return;
      }
      if (endSec - startSec > MAX_CLIP_SEC) {
        send(res, 400, { ok: false, error: "too-long" });
        return;
      }
      const buf = await cutClip({ url: video, startSec, endSec: Math.min(endSec, startSec + MAX_CLIP_SEC) });
      send(res, 200, buf, {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="hookcut-clip.mp4"',
        "Cache-Control": "no-store",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "render";
      const blocked = /403|sign in|bot|confirm you're not|http error 403/i.test(message);
      send(res, blocked ? 403 : 500, { ok: false, error: blocked ? "youtube-blocked" : "render", detail: message.slice(0, 400) });
    }
    return;
  }

  send(res, 404, { ok: false, error: "not-found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`hookcut worker on ${PORT}`);
});
