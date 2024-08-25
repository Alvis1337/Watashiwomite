import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getMALAnimeList } from '../../../utils/utils';

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
