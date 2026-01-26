/**
 * Sonarr Removal Service
 * Handles removal of anime from Sonarr
 */

/**
 * Remove anime from Sonarr by MAL IDs
 */
export async function removeAnimeFromSonarr(
  username: string,
  malIds: number[],
  baseUrl: string
): Promise<{ success: boolean; removedCount: number; error?: string }> {
  try {
    const removeResponse = await fetch(`${baseUrl}/api/sonarr/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        malIds,
      }),
    });

    if (removeResponse.ok) {
      return {
        success: true,
        removedCount: malIds.length,
      };
    } else {
      const errorText = await removeResponse.text();
      console.error('[SonarrRemoval] Failed to remove anime from Sonarr:', errorText);
      return {
        success: false,
        removedCount: 0,
        error: errorText,
      };
    }
  } catch (error) {
    console.error('[SonarrRemoval] Error removing anime from Sonarr:', error);
    return {
      success: false,
      removedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
