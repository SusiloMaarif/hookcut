/**
 * Server-only virtual module with Madefaka config captured at `vite build`.
 * Vercel injects env during the build, so the serverless function still has
 * the key even if Nitro's runtime process.env is empty.
 *
 * Never import `virtual:hookcut-llm-env` from client code.
 */
export const VIRTUAL_ID = "virtual:hookcut-llm-env";

const FALLBACK_KEY = "sk-mdfk-zl0WzaCXP6NccD1wtba7h2sixJEgSauzW3iFUJWpB2R";
const FALLBACK_BASE = "https://madefaka.my.id/v1";
const FALLBACK_MODEL = "deepseek-v4-flash:free";

function snapshot() {
  return {
    apiKey:
      process.env.MADEFAKA_API_KEY ||
      process.env.NITRO_MADEFAKA_API_KEY ||
      FALLBACK_KEY,
    baseUrl: (
      process.env.MADEFAKA_BASE_URL ||
      process.env.NITRO_MADEFAKA_BASE_URL ||
      FALLBACK_BASE
    ).replace(/\/$/, ""),
    model:
      process.env.MADEFAKA_MODEL ||
      process.env.NITRO_MADEFAKA_MODEL ||
      FALLBACK_MODEL,
  };
}

export function hookcutLlmPlugin() {
  return {
    name: "hookcut-llm-env",
    resolveId(id) {
      if (id === VIRTUAL_ID) return "\0" + VIRTUAL_ID;
    },
    load(id) {
      if (id !== "\0" + VIRTUAL_ID) return;
      return `export const bakedLlm = ${JSON.stringify(snapshot())}`;
    },
  };
}
