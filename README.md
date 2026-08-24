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

## Flow

1. Studio → paste YouTube URL → **Get clips**
2. Captions load automatically when the video has subtitles
3. Agent returns timestamped clips, Hormozi-style captions, viral scores
4. Editor: 9:16 preview (YouTube source + burned captions), copy pack, download SRT, queue

This is **not** a pixel-perfect Vugola clone. Vugola re-encodes MP4 and auto-posts to TikTok. Hookcut is the director + caption studio. You still post.

## Models (Madefaka `/v1/models`)

| id | notes |
|---|---|
| `deepseek-v4-flash:free` | default, unlimited core |
| `mimo-v2.5:free` | unlimited core, fallback |
| `qwen3.8-27b:free` | free |

Set `MADEFAKA_MODEL` to switch.

## Security

Never commit API keys. The key that was pasted in chat should be rotated if this repo is ever made public.
