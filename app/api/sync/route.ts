import { NextRequest, NextResponse } from "next/server";
import prisma from '../../../lib/prisma';
import {getTvdbIds, getSonarrRootFolder } from "@/utils/utils";
import { addAnimeToSonarr} from "@/utils/updatedUtils"

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const username = url.searchParams.get('username')

    if (!username) {
        return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
    }

    const userList = await prisma.animeList.findUnique({
        where: { username },
        include: {
            anime: true,
            sonarrSeries: true
        }
    })

    if (!userList?.anime || !userList?.sonarrSeries) {
        return NextResponse.json({ message: 'Failed to pull users MAL list.' }, { status: 400 });
    }
    const animeTitles = userList.anime.map(a => a.title.toLowerCase())

    const sonarrSeries = userList.sonarrSeries.map(s => s.title.toLowerCase());

    const uniqueToMal = animeTitles.filter(title => !sonarrSeries.includes(title));

    const uniqueToSonarr = sonarrSeries.filter(title => !animeTitles.includes(title));

    if(uniqueToMal.length > 1) {
        const tvdbidApiKey = process.env.TVDBID_API_KEY
        const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey)
        const rootFolder = await getSonarrRootFolder()
        const results = await addAnimeToSonarr(tvdbids, rootFolder[0]['path']);
        return NextResponse.json({message: results, uniqueToMal: uniqueToMal, uniqueToSonarr: uniqueToSonarr},  {status: 200})
    }

    if (uniqueToSonarr.length > 1 ) {
        return NextResponse.json({message: 'Your Sonarr is out of sync, please resolve manually'},  {status: 400})
    }

    if (uniqueToMal.length === 0 && uniqueToSonarr.length === 0) {
        return NextResponse.json({message: 'Everything is already synced!'}, {status: 200})
    }

    
}