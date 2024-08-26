import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getMALAnimeList } from '../../../utils/utils';

/**
 * @swagger
 * /api/mal:
 *   get:
 *     summary: Retrieves the anime list for a specific MyAnimeList user.
 *     description: Fetches the current anime list for a given MyAnimeList username and updates or creates records in the local database. The updated list is returned.
 *     tags:
 *       - MyAnimeList
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         description: MyAnimeList username for which to fetch the anime list.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved and updated the user's anime list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 animeList:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Internal ID of the anime.
 *                         example: 3
 *                       malId:
 *                         type: integer
 *                         description: MyAnimeList ID of the anime.
 *                         example: 41025
 *                       title:
 *                         type: string
 *                         description: Title of the anime.
 *                         example: Fumetsu no Anata e
 *                       mainPictureMedium:
 *                         type: string
 *                         description: URL of the medium-sized main picture of the anime.
 *                         example: https://cdn.myanimelist.net/images/anime/1880/118484.jpg
 *                       mainPictureLarge:
 *                         type: string
 *                         description: URL of the large-sized main picture of the anime.
 *                         example: https://cdn.myanimelist.net/images/anime/1880/118484l.jpg
 *                       status:
 *                         type: string
 *                         description: Current watching status of the anime.
 *                         example: watching
 *                       score:
 *                         type: integer
 *                         description: User's score for the anime.
 *                         example: 0
 *                       numEpisodesWatched:
 *                         type: integer
 *                         description: Number of episodes watched by the user.
 *                         example: 4
 *                       isRewatching:
 *                         type: boolean
 *                         description: Whether the user is rewatching the anime.
 *                         example: false
 *                       updatedAtMAL:
 *                         type: string
 *                         format: date-time
 *                         description: The date and time when the anime was last updated on MyAnimeList.
 *                         example: 2021-08-20T05:32:04.000Z
 *                       startDate:
 *                         type: string
 *                         format: date
 *                         description: The start date of the anime for the user.
 *                         example: null
 *                       animeListId:
 *                         type: integer
 *                         description: Internal ID of the associated anime list.
 *                         example: 1
 *                       tvdbId:
 *                         type: integer
 *                         description: TVDB ID for the anime, if applicable.
 *                         example: null
 *       400:
 *         description: Username is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Username is required.
 *       404:
 *         description: MyAnimeList token not found for the given username.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token not found.
 *       500:
 *         description: An error occurred during the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: An error occurred.
 */

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');

    if (!username) {
        return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
    }

    try {
        const tokenRecord = await prisma.malToken.findUnique({
            where: { username },
        });

        if (!tokenRecord) {
            return NextResponse.json({ message: 'Token not found.' }, { status: 404 });
        }

        const animeListObject = await prisma.animeList.findUnique({
            where: { username },
            include: { anime: true },
        });

        const animeList = await getMALAnimeList(tokenRecord.token, username);

        const updatedAnimeList = [];

        for (const anime of animeList) {
            const updatedAnime = await prisma.anime.upsert({
                where: { malId: anime.malId },
                update: {
                    title: anime.title,
                    mainPictureMedium: anime.mainPictureMedium,
                    mainPictureLarge: anime.mainPictureLarge,
                    status: anime.status,
                    score: anime.score,
                    numEpisodesWatched: anime.numEpisodesWatched,
                    isRewatching: anime.isRewatching,
                    updatedAtMAL: anime.updatedAtMAL,
                    startDate: anime.startDate,
                },
                create: {
                    malId: anime.malId,
                    title: anime.title,
                    mainPictureMedium: anime.mainPictureMedium,
                    mainPictureLarge: anime.mainPictureLarge,
                    status: anime.status,
                    score: anime.score,
                    numEpisodesWatched: anime.numEpisodesWatched,
                    isRewatching: anime.isRewatching,
                    updatedAtMAL: anime.updatedAtMAL,
                    startDate: anime.startDate,
                    animeList: {
                        connect: { id: animeListObject?.id ?? -1 },
                    },
                    tvdbId: null
                },
            });
            updatedAnimeList.push(updatedAnime);
        }

        return NextResponse.json({animeList: updatedAnimeList }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'An error occurred.' }, { status: 500 });
    }
}
