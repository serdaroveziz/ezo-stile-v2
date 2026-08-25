/* EZO STİLE v2 - Official Production AI Provider Router Engine */
export const OFFICIAL_AI_MODELS = {
  replicate: {
    providerName: 'Replicate API',
    exactModelName: 'stability-ai/sdxl-inpainting',
    modelVersion: '95b722310e9324e9db95844445f774d75601265823ed492ee2741f2370737019',
    endpoint: 'https://api.replicate.com/v1/predictions',
    costPerRunUsd: 0.012
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