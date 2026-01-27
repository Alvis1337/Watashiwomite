import { getSonarrAnimeList, saveSonarrSeries } from '@/utils/utils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/sonarr/sync:
 *   get:
 *     summary: Synchronize Sonarr anime list with the database for a specific user
 *     description: Fetches the Sonarr anime list and saves it to the database for the specified user.
 *     operationId: syncSonarrList
 *     tags:
 *       - Sonarr
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: The username of the user for whom the Sonarr series list is to be synchronized.
 *     responses:
 *       '200':
 *         description: A confirmation of the synchronization and the list of saved series
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saveList:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The unique identifier of the anime series.
 *                       title:
 *                         type: string
 *                         description: The title of the anime series.
 *                       alternateTitles:
 *                         type: array
 *                         description: Alternate titles for the anime series.
 *                         items:
 *                           type: string
 *                       sortTitle:
 *                         type: string
 *                         description: The sort title of the anime series.
 *                       status:
 *                         type: string
 *                         description: The airing status of the anime series.
 *                       overview:
 *                         type: string
 *                         description: A summary of the anime series.
 *                       previousAiring:
 *                         type: string
 *                         format: date-time
 *                         description: The date and time of the previous airing.
 *                       network:
 *                         type: string
 *                         description: The network that aired the anime series.
 *                       airTime:
 *                         type: string
 *                         description: The time the anime series aired.
 *                       originalLanguage:
 *                         type: string
 *                         description: The original language of the anime series.
 *                       year:
 *                         type: integer
 *                         description: The release year of the anime series.
 *                       tvdbId:
 *                         type: integer
 *                         description: The TVDB ID of the anime series.
 *                       imdbId:
 *                         type: string
 *                         description: The IMDb ID of the anime series.
 *                       certification:
 *                         type: string
 *                         description: The certification of the anime series.
 *                       ratings:
 *                         type: object
 *                         properties:
 *                           value:
 *                             type: number
 *                             format: float
 *                             description: The rating of the anime series.
 *                           votes:
 *                             type: integer
 *                             description: The number of votes the anime series has received.
 *                       statistics:
 *                         type: object
 *                         properties:
 *                           sizeOnDisk:
 *                             type: integer
 *                             description: The size of the series on disk.
 *                           seasonCount:
 *                             type: integer
 *                             description: The number of seasons in the series.
 *                           episodeCount:
 *                             type: integer
 *                             description: The number of episodes in the series.
 *                           totalEpisodeCount:
 *                             type: integer
 *                             description: The total number of episodes in the series.
 *       '400':
 *         description: Username was not provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Username was not provided
 *       '500':
 *         description: Failed to fetch or save list from Sonarr
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to fetch list from Sonarr
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const username = url.searchParams.get('username');

  if (!username) {
    return NextResponse.json({ message: 'Username was not provided' }, { status: 400 });
  }

  try {
    const sonarrList = await getSonarrAnimeList();
    const saveList = await saveSonarrSeries(username, sonarrList);
    return NextResponse.json({ saveList });
  } catch (e: any) {
    console.error(e);
    
    const errorMessage = e.message || '';
    
    // Check if it's a Sonarr API error and extract status code
    if (errorMessage.includes('Sonarr API error: 401')) {
      return NextResponse.json(
        { 
          message: 'Sonarr authentication failed. Please check your API key in Settings.',
          error: 'SONARR_AUTH_FAILED' 
        }, 
        { status: 401 }
      );
    }
    
    if (errorMessage.includes('Sonarr API error:')) {
      return NextResponse.json(
        { 
          message: errorMessage || 'Failed to connect to Sonarr. Please verify Sonarr is running and the URL is correct.',
          error: 'SONARR_CONNECTION_FAILED' 
        }, 
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { 
        message: errorMessage || 'Failed to fetch list from Sonarr',
        error: 'UNKNOWN_ERROR' 
      }, 
      { status: 500 }
    );
  }
}
