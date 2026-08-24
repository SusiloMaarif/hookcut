# Hookcut

AI clipping agent: paste a YouTube link, pull captions, get viral 9:16 clip packs (hook, caption, SRT, queue).

Uses [Madefaka](https://madefaka.my.id/). Default model: `deepseek-v4-flash:free` (unlimited). Fallback: `mimo-v2.5:free`.

## Run locally

```bash
npm install
npm run dev
```

App listens on `0.0.0.0:8080`. Optional overrides in a gitignored `.local-secrets` file:

```
MADEFAKA_API_KEY=...
MADEFAKA_BASE_URL=https://madefaka.my.id/v1
MADEFAKA_MODEL=deepseek-v4-flash:free
```

## Deploy to Vercel

Repo: [SusiloMaarif/hookcut](https://github.com/SusiloMaarif/hookcut).

The Madefaka key is baked into the **server** function at build (never the browser bundle), so the clipping agent works even if Vercel env is empty. Optional env overrides:

| Name | Value |
|---|---|
| `MADEFAKA_API_KEY` | override key (never `VITE_` prefix) |
| `MADEFAKA_BASE_URL` | `https://madefaka.my.id/v1` |
| `MADEFAKA_MODEL` | `deepseek-v4-flash:free` |
| `VITE_AUTH_ENABLED` | `false` |

Keep this repository **private**. This app does **not** need a database.

## Direct clip download (Railway)

Vercel cannot fetch YouTube video files. The clip worker (`Dockerfile` + `worker/server.mjs`) runs on Railway:

1. [New project from GitHub](https://railway.app/new) → repo **hookcut**
2. Wait for the deploy, then **Settings → Networking → Generate Domain**
3. Paste that URL into Hookcut’s download dialog (once)

Optional Railway env: `YTDLP_COOKIES` (Netscape cookies.txt) if YouTube blocks the server IP.


## Flow

1. Studio → paste YouTube URL → **Get clips**
2. Captions load automatically when the video has subtitles
3. Agent returns timestamped clips, Hormozi-style captions, viral scores
4. Editor: 9:16 preview, copy pack, download SRT, queue

YouTube caption scrape can fail from some cloud IPs (including Vercel). If it does, paste a transcript in the dialog.

## Models (Madefaka `/v1/models`)

| id | notes |
|---|---|
| `deepseek-v4-flash:free` | default, unlimited core |
| `mimo-v2.5:free` | unlimited core, fallback |
| `qwen3.8-27b:free` | free |
