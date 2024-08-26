import { getSonarrAnimeList} from "@/utils/utils";
import {NextResponse } from "next/server";

/**
 * @swagger
 * /api/sonarr/anime-list:
 *   get:
 *     summary: Retrieve a list of anime series from Sonarr
 *     description: Fetches a list of anime series from Sonarr and returns detailed information about each series.
 *     operationId: getSonarrAnimeList
 *     tags:
 *       - Sonarr
 *     responses:
 *       '200':
 *         description: A list of anime series from Sonarr
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sonarrList:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         description: The title of the anime.
 *                       alternateTitles:
 *                         type: array
 *                         description: Alternate titles for the anime.
 *                         items:
 *                           type: string
 *                       sortTitle:
 *                         type: string
 *                         description: The sort title of the anime.
 *                       status:
 *                         type: string
 *                         description: The airing status of the anime.
 *                       ended:
 *                         type: boolean
 *                         description: Whether the anime has ended.
 *                       overview:
 *                         type: string
 *                         description: A short summary of the anime's plot.
 *                       previousAiring:
 *                         type: string
 *                         format: date-time
 *                         description: The date and time of the previous airing.
 *                       network:
 *                         type: string
 *                         description: The network that aired the anime.
 *                       airTime:
 *                         type: string
 *                         description: The time the anime aired.
 *                       originalLanguage:
 *                         type: object
 *                         description: The original language of the anime.
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                       year:
 *                         type: integer
 *                         description: The release year of the anime.
 *                       tvdbId:
 *                         type: integer
 *                         description: The TVDB ID of the anime.
 *                       imdbId:
 *                         type: string
 *                         description: The IMDb ID of the anime.
 *                       genres:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of genres the anime belongs to.
 *                       ratings:
 *                         type: object
 *                         properties:
 *                           votes:
 *                             type: integer
 *                             description: The number of votes the anime has received.
 *                           value:
 *                             type: number
 *                             format: float
 *                             description: The rating of the anime.
 *       '500':
 *         description: Failed to fetch list from Sonarr
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to fetch list from Sonarr
 */


export async function GET() {
    try{
        const sonarrList = await getSonarrAnimeList()
        return NextResponse.json({sonarrList})
    } catch (e) {
        console.error(e)
        return NextResponse.json({message: 'Failed to fetch list from Sonarr'}, {status: 500})
    }
}