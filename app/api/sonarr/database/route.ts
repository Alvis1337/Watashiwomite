import prisma from '../../../../lib/prisma'
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/sonarr/database:
 *   get:
 *     summary: Retrieve a list of Sonarr series from the database for a specific user
 *     description: Fetches a list of Sonarr series associated with a user from the database based on their username.
 *     operationId: getSonarrSeriesByUser
 *     tags:
 *       - Sonarr
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: The username of the user whose Sonarr series list is to be fetched.
 *     responses:
 *       '200':
 *         description: A list of Sonarr series from the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 series:
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
 *         description: Failed to fetch list from the database
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
    try {
        if (username) {
            const list = await prisma.animeList.findUnique({
                where: { username },
                include: { sonarrSeries: true }
            })
            const series = list?.sonarrSeries
            return NextResponse.json({ series }, {status: 200})
        } else {
            return NextResponse.json({message: 'Username was not provided'}, {status: 400})
        }
    } catch (e) {
        console.error(e)
        return NextResponse.json({ message: 'Failed to fetch list from Sonarr' }, { status: 500 })
    }
}