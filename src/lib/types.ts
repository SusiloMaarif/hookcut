export type Lang = "id" | "en";
export type CaptionStyle = "hormozi" | "box" | "glow" | "scale" | "minimal" | "highlight";
export type Aspect = "9:16" | "1:1" | "16:9";
export type Platform = "tiktok" | "shorts" | "reels" | "x" | "linkedin";
export type ProjectStatus = "draft" | "running" | "ready";
export type ClipStatus = "ready" | "queued" | "exported";

export type Clip = {
  id: string;
  startSec: number;
  endSec: number;
  hook: string;
  title: string;
  caption: string;
  keywords: string[];
  viralScore: number;
  why: string;
  hashtags: string[];
  platforms: Platform[];
  estimated?: boolean;
  status: ClipStatus;
  scheduledAt?: string;
};

export type Project = {
  id: string;
  title: string;
  sourceUrl?: string;
  videoId?: string;
  thumbnail: string;
  durationSec: number;
  transcript: string;
  language: Lang;
  clips: Clip[];
  captionStyle: CaptionStyle;
  aspect: Aspect;
  createdAt: string;
  status: ProjectStatus;
  error?: string;
};

export type AgentClip = {
  startSec: number;
  endSec: number;
  hook: string;
  title: string;
  caption: string;
  keywords: string[];
  viralScore: number;
  why: string;
  hashtags: string[];
};
