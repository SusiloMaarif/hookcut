# Hookcut

AI clipping agent: paste a YouTube link, pull captions, get viral 9:16 clip packs (hook, caption, SRT, queue).

Uses your [Madefaka](https://madefaka.my.id/) key. Default model: `deepseek-v4-flash:free` (unlimited). Fallback: `mimo-v2.5:free`.

## Run locally

```bash
npm install
cp .env.example .env
# put MADEFAKA_API_KEY in .env
set -a && . ./.env && set +a
npm run dev
```

App listens on `0.0.0.0:8080`.

## Deploy to Vercel

Repo: [SusiloMaarif/hookcut](https://github.com/SusiloMaarif/hookcut) (private).

1. Open [vercel.com/new](https://vercel.com/new)
2. Import **SusiloMaarif/hookcut** (connect GitHub if asked)
3. Framework preset: **TanStack Start** (already set in `vercel.json`)
4. **Do not** override Output Directory
5. Add environment variables (Production + Preview):

| Name | Value |
|---|---|
| `MADEFAKA_API_KEY` | your Madefaka key (never `VITE_` prefix) |
| `MADEFAKA_BASE_URL` | `https://madefaka.my.id/v1` |
| `MADEFAKA_MODEL` | `deepseek-v4-flash:free` |
| `VITE_AUTH_ENABLED` | `false` |

6. Deploy

After the first deploy, add the same env vars and **redeploy** if the agent says AI is unavailable.

This app does **not** need a database. Leave `DATABASE_URL` empty.

## Flow

1. Studio → paste YouTube URL → **Get clips**
2. Captions load automatically when the video has subtitles
3. Agent returns timestamped clips, Hormozi-style captions, viral scores
4. Editor: 9:16 preview (YouTube source + burned captions), copy pack, download SRT, queue

This is **not** a pixel-perfect Vugola clone. Vugola re-encodes MP4 and auto-posts to TikTok. Hookcut is the director + caption studio. You still post.

YouTube caption scrape can fail from some cloud IPs (including Vercel). If it does, paste a transcript in the dialog.

## Models (Madefaka `/v1/models`)

| id | notes |
|---|---|
| `deepseek-v4-flash:free` | default, unlimited core |
| `mimo-v2.5:free` | unlimited core, fallback |
| `qwen3.8-27b:free` | free |

Set `MADEFAKA_MODEL` to switch.

## Security

Never commit API keys. Put them in Vercel env / local `.env` only.
