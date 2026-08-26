/* EZO STİLE v2 - Official Production AI Provider Router Engine */
export const OFFICIAL_AI_MODELS = {
  replicate: {
    providerName: 'Replicate API',
    exactModelName: 'replicate/hello-world',
    modelVersion: '5c7d5dc6dd8278032f5b49b9c06a9621c2b1d56ecef94b4a4773d9e00cd30940',
    endpoint: 'https://api.replicate.com/v1/predictions',
    costPerRunUsd: 0.001
  },
  fal: {
    providerName: 'Fal.ai API',
    exactModelName: 'fal-ai/fast-sdxl/inpainting',
    endpoint: 'https://fal.run/fal-ai/fast-sdxl/inpainting',
    costPerRunUsd: 0.015
  }
};

export function resolveProductionAiModel(providerPreference = 'replicate') {
  if (providerPreference === 'fal') {
    return OFFICIAL_AI_MODELS.fal;
  }
  return OFFICIAL_AI_MODELS.replicate;
}