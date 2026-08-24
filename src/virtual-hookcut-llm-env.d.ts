declare module "virtual:hookcut-llm-env" {
  export const bakedLlm: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
}
