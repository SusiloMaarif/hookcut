import { createServerFn } from "@tanstack/react-start";
import type { Lang } from "./types";

type AgentInput = {
  title: string;
  durationSec: number;
  transcript: string;
  language: Lang;
  clipCount: number;
};

export const runClippingAgent = createServerFn({ method: "POST" })
  .validator((input: AgentInput) => input)
  .handler(async ({ data }) => {
    const { runClipJob } = await import("./llm.server");
    return runClipJob(data);
  });

export const rewriteClipCopy = createServerFn({ method: "POST" })
  .validator((input: { caption: string; hook: string; language: Lang; title: string }) => input)
  .handler(async ({ data }) => {
    const { rewriteJob } = await import("./llm.server");
    return rewriteJob(data);
  });
