import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { runClippingAgent } from "@/lib/ai";
import { t as i18n } from "@/lib/i18n";
import { agentClipsToClips, newDraft, useHookcut } from "@/lib/store";
import { parseYoutubeId } from "@/lib/utils";
import { saveSourceFile } from "@/lib/source-file";
import { fetchYoutubeSource } from "@/lib/youtube";
import { Button } from "./ui/button";
import { Input, Label, Textarea } from "./ui/field";
import type { Lang } from "@/lib/types";

export function CreateProject({
  open,
  onClose,
  initialUrl = "",
}: {
  open: boolean;
  onClose: () => void;
  initialUrl?: string;
}) {
  const lang = useHookcut((s) => s.lang);
  const upsert = useHookcut((s) => s.upsertProject);
  const patch = useHookcut((s) => s.patchProject);
  const c = i18n(lang);
  const navigate = useNavigate();

  const [url, setUrl] = useState(initialUrl);
  const [transcript, setTranscript] = useState("");
  const [clipCount, setClipCount] = useState(5);
  const [minutes, setMinutes] = useState(45);
  const [capLang, setCapLang] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [captionNote, setCaptionNote] = useState("");
  const [meta, setMeta] = useState<{ title?: string; videoId?: string; thumbnail?: string }>({});
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setCapLang(lang);
    setCaptionNote("");
    setTranscript("");
    setMeta({});
    setSourceFile(null);
  }, [open, initialUrl, lang]);

  useEffect(() => {
    if (!open) return;
    const id = parseYoutubeId(url);
    if (!id) return;
    let cancelled = false;
    setPulling(true);
    void (async () => {
      try {
        const src = await fetchYoutubeSource({ data: { url, language: capLang } });
        if (cancelled || !src.ok) return;
        setMeta({ title: src.title, videoId: src.videoId, thumbnail: src.thumbnail });
        if (src.durationSec) setMinutes(Math.max(5, Math.round(src.durationSec / 60)));
        if (src.transcript) {
          setTranscript(src.transcript);
          setCaptionNote(c.captionsReady);
        } else {
          setCaptionNote(c.noCaptions);
        }
      } catch {
        if (!cancelled) setCaptionNote(c.noCaptions);
      } finally {
        if (!cancelled) setPulling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url, capLang, c.captionsReady, c.noCaptions]);

  if (!open) return null;

  async function run() {
    if (!url.trim() && !transcript.trim()) {
      toast(c.needSource);
      return;
    }
    setBusy(true);
    try {
      let title = meta.title || transcript.trim().slice(0, 48) || "Untitled source";
      let videoId = meta.videoId;
      let thumbnail = meta.thumbnail;
      const parsed = parseYoutubeId(url);
      if (parsed && !videoId) {
        const src = await fetchYoutubeSource({ data: { url, language: capLang } });
        if (src.ok) {
          title = src.title;
          videoId = src.videoId;
          thumbnail = src.thumbnail;
          if (src.transcript && !transcript.trim()) setTranscript(src.transcript);
        } else {
          videoId = parsed;
        }
      }
      const usedTranscript = transcript;
      const project = newDraft({
        title,
        sourceUrl: url.trim() || undefined,
        videoId,
        thumbnail,
        durationSec: Math.max(60, minutes * 60),
        transcript: usedTranscript,
        language: capLang,
      });
      upsert(project);
      if (sourceFile) await saveSourceFile(project.id, sourceFile);
      onClose();
      await navigate({ to: "/clip/$id", params: { id: project.id } });

      const result = await runClippingAgent({
        data: {
          title,
          durationSec: project.durationSec,
          transcript: usedTranscript,
          language: capLang,
          clipCount,
        },
      });
      if (!result.ok) {
        patch(project.id, {
          status: "draft",
          error: result.error === "unavailable" ? c.aiDown : c.aiErr,
        });
        toast(result.error === "unavailable" ? c.aiDown : c.aiErr);
        return;
      }
      patch(project.id, {
        status: "ready",
        clips: agentClipsToClips(result.clips, result.estimated),
        error: undefined,
      });
    } catch {
      toast(c.aiErr);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-labelledby="create-title"
        className="w-full max-w-lg rounded-t-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-title" className="font-display text-2xl">
          {c.newProject}
        </h2>
        <p className="mt-1 text-sm text-muted">{c.studioSub}</p>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="url">{c.urlLabel}</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={c.pastePh}
            />
            {pulling ? <p className="mt-2 text-xs text-subtle">{c.fetchingCaptions}</p> : null}
            {!pulling && captionNote ? <p className="mt-2 text-xs text-muted">{captionNote}</p> : null}
          </div>
          <div>
            <Label htmlFor="src">{c.sourceVideo}</Label>
            <input
              id="src"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:h-11 file:rounded-md file:border-0 file:bg-raised file:px-3 file:text-sm file:text-fg"
              onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-subtle">
              {sourceFile ? sourceFile.name : c.sourceVideoHint}
            </p>
          </div>
          <div>
            <Label htmlFor="tr">{c.transcriptLabel}</Label>
            <Textarea
              id="tr"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={c.transcriptPh}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="lang">{c.language}</Label>
              <select
                id="lang"
                className="h-11 w-full rounded-md bg-raised px-2 text-sm text-fg shadow-[var(--shadow-border)]"
                value={capLang}
                onChange={(e) => setCapLang(e.target.value as Lang)}
              >
                <option value="id">ID</option>
                <option value="en">EN</option>
              </select>
            </div>
            <div>
              <Label htmlFor="count">{c.clipCount}</Label>
              <select
                id="count"
                className="h-11 w-full rounded-md bg-raised px-2 text-sm text-fg shadow-[var(--shadow-border)]"
                value={clipCount}
                onChange={(e) => setClipCount(Number(e.target.value))}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
              </select>
            </div>
            <div>
              <Label htmlFor="mins">{c.duration}</Label>
              <Input
                id="mins"
                type="number"
                min={5}
                max={180}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value) || 45)}
              />
            </div>
          </div>
          <p className="text-xs text-subtle">{c.clipLengthHint}</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button onClick={() => void run()} disabled={busy || pulling}>
            {busy ? c.running : c.runAgent}
          </Button>
        </div>
      </div>
    </div>
  );
}
