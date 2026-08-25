/* EZO STİLE v2 - Serverless AI Provider Routing Engine */
export const AI_PROVIDERS = {
  economy: {
    name: 'Economy-Fast-V1',
    costUsd: 0.01,
    facePreservationScore: 0.85
  },
  premium: {
    name: 'Premium-FaceGuard-V2',
    costUsd: 0.04,
    facePreservationScore: 0.98
  }
};

export function resolveAiProvider(requestedMode) {
  const mode = (requestedMode || 'economy').toLowerCase();
  if (mode === 'premium') {
    return AI_PROVIDERS.premium;
  }
  return AI_PROVIDERS.economy;
}