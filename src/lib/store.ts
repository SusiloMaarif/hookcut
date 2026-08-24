import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SAMPLES } from "./samples";
import type { Aspect, CaptionStyle, Clip, Lang, Platform, Project } from "./types";
import { uid } from "./utils";

type State = {
  lang: Lang;
  projects: Project[];
  setLang: (lang: Lang) => void;
  upsertProject: (project: Project) => void;
  removeProject: (id: string) => void;
  patchProject: (id: string, patch: Partial<Project>) => void;
  patchClip: (projectId: string, clipId: string, patch: Partial<Clip>) => void;
  setClipStatus: (projectId: string, clipId: string, status: Clip["status"], extra?: Partial<Clip>) => void;
  queued: () => { project: Project; clip: Clip }[];
};

export const useHookcut = create<State>()(
  persist(
    (set, get) => ({
      lang: "id",
      projects: SAMPLES,
      setLang: (lang) => set({ lang }),
      upsertProject: (project) =>
        set((s) => {
          const i = s.projects.findIndex((p) => p.id === project.id);
          if (i === -1) return { projects: [project, ...s.projects] };
          const next = s.projects.slice();
          next[i] = project;
          return { projects: next };
        }),
      removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      patchProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      patchClip: (projectId, clipId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : { ...p, clips: p.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)) },
          ),
        })),
      setClipStatus: (projectId, clipId, status, extra) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  clips: p.clips.map((c) =>
                    c.id === clipId ? { ...c, status, ...extra } : c,
                  ),
                },
          ),
        })),
      queued: () => {
        const rows: { project: Project; clip: Clip }[] = [];
        for (const project of get().projects) {
          for (const clip of project.clips) {
            if (clip.status === "queued") rows.push({ project, clip });
          }
        }
        return rows.sort((a, b) =>
          (a.clip.scheduledAt ?? "").localeCompare(b.clip.scheduledAt ?? ""),
        );
      },
    }),
    {
      name: "hookcut-v1",
      partialize: (s) => ({ lang: s.lang, projects: s.projects }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const projects = p.projects?.length ? p.projects : current.projects;
        return { ...current, ...p, projects };
      },
    },
  ),
);

export function newDraft(input: {
  title: string;
  sourceUrl?: string;
  videoId?: string;
  thumbnail?: string;
  durationSec: number;
  transcript: string;
  language: Lang;
  captionStyle?: CaptionStyle;
  aspect?: Aspect;
}): Project {
  return {
    id: uid("proj"),
    title: input.title,
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
    thumbnail: input.thumbnail || "/media/studio.jpg",
    durationSec: input.durationSec,
    transcript: input.transcript,
    language: input.language,
    clips: [],
    captionStyle: input.captionStyle ?? "hormozi",
    aspect: input.aspect ?? "9:16",
    createdAt: new Date().toISOString(),
    status: "running",
  };
}

export function agentClipsToClips(
  clips: {
    startSec: number;
    endSec: number;
    hook: string;
    title: string;
    caption: string;
    keywords: string[];
    viralScore: number;
    why: string;
    hashtags: string[];
  }[],
  estimated: boolean,
): Clip[] {
  return clips.map((c, i) => ({
    id: uid(`clip${i}`),
    startSec: Math.max(0, Math.round(c.startSec)),
    endSec: Math.max(Math.round(c.startSec) + 8, Math.round(c.endSec)),
    hook: c.hook,
    title: c.title,
    caption: c.caption,
    keywords: c.keywords ?? [],
    viralScore: Math.min(99, Math.max(50, Math.round(c.viralScore))),
    why: c.why,
    hashtags: (c.hashtags ?? []).slice(0, 6),
    platforms: ["tiktok", "shorts", "reels"] as Platform[],
    estimated,
    status: "ready" as const,
  }));
}
