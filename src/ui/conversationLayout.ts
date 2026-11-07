/** Keep the picture prominent, allowing it to yield at most about a quarter of its original height.
 * The remaining panel space belongs to readable dialogue and the first three model answers.
 * Long answers and large text can still scroll inside their own panel. */
export function mobileConversationBudget(viewportHeight: number, requiredPanelHeight: number, preferredTranscriptHeight = 0) {
  const fullScene = Math.max(0, viewportHeight * 0.42 - 8);
  const minimumScene = Math.min(fullScene, viewportHeight * 0.30);
  const sceneHeight = Math.round(Math.max(minimumScene, Math.min(fullScene, viewportHeight - 8 - requiredPanelHeight)));
  const overflow = Math.max(0, requiredPanelHeight - (viewportHeight - 8 - sceneHeight));
  return {
    sceneHeight,
    // When the picture has reached its limit, reclaim spare transcript height before scrolling the answers.
    transcriptHeight: Math.max(Math.min(84, preferredTranscriptHeight), preferredTranscriptHeight - overflow),
  };
}
