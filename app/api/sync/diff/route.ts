import { NextRequest, NextResponse } from "next/server";
import prisma from '../../../../lib/prisma';
import { getTvdbIds, getSonarrRootFolder } from "@/utils/utils";
import { addAnimeToSonarr } from "@/utils/updatedUtils";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    let diff = url.searchParams.get('diff');

    console.log('Syncing Sonarr list and MAL list');

    try {
        const syncSonarr = await fetch(`https://localhost:3000/api/sonarr/sync?username=${username}`);
        if (!syncSonarr.ok) throw new Error('Failed to sync Sonarr list');

        const syncMal = await fetch(`https://localhost:3000/api/mal?username=${username}`);
        if (!syncMal.ok) throw new Error('Failed to sync MAL list');
    } catch (e) {
        console.error('Failed to sync your lists before the operation:', e);
    }

    if (!username) {
        return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
    }

    const userList = await prisma.animeList.findUnique({
        where: { username },
        include: {
            anime: true,
            sonarrSeries: true
        }
    });

    if (!userList?.anime || !userList?.sonarrSeries) {
        return NextResponse.json({ message: 'Failed to pull user’s MAL list.' }, { status: 400 });
    }

    function normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function levenshtein(a: string, b: string): number {
        const alen = a.length;
        const blen = b.length;

        if (alen === 0) return blen;
        if (blen === 0) return alen;

        const matrix: number[][] = Array.from({ length: alen + 1 }, () => Array(blen + 1).fill(0));

        for (let i = 0; i <= alen; i++) {
            matrix[i][0] = i;
        }
        for (let j = 0; j <= blen; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= alen; i++) {
            for (let j = 1; j <= blen; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,       
                    matrix[i][j - 1] + 1,       
                    matrix[i - 1][j - 1] + cost 
                );
            }
        }

        return matrix[alen][blen];
    }

    function findClosestMatch(title: string, candidates: string[], threshold: number = 5): string | null {
        const normalizedTitle = normalizeTitle(title);
        let closestMatch: string | null = null;
        let closestDistance = threshold;

        for (const candidate of candidates) {
            const normalizedCandidate = normalizeTitle(candidate);
            const distance = levenshtein(normalizedTitle, normalizedCandidate);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestMatch = candidate;
            }
        }

        return closestMatch;
    }

    const animeTitles = userList.anime.map(a => a.title);

    const sonarrSeries = userList.sonarrSeries.map(s => {
        const alternateTitles = Array.isArray(s.alternateTitles)
            ? s.alternateTitles
                .map(at => (typeof at === 'object' && at !== null && 'title' in at) ? (at.title as string).toLowerCase() : null)
                .filter((title): title is string => title !== null)
            : [];
            return {
                id: s.id, 
                titles: [s.title.toLowerCase(), ...alternateTitles]
            };
    });

    const sonarrTitles = sonarrSeries.flatMap(series => series.titles);
    const sonarrTitlesSet = new Set(sonarrTitles);

    const uniqueToMal = animeTitles.filter(title => {
        const match = findClosestMatch(title, Array.from(sonarrTitlesSet));
        return !match || levenshtein(normalizeTitle(title), normalizeTitle(match)) > 5;
    });

    const uniqueToSonarr = Array.from(sonarrTitlesSet).filter(title => {
        const match = findClosestMatch(title, animeTitles);
        return !match || levenshtein(normalizeTitle(title), normalizeTitle(match)) > 5;
    });

    for (const series of sonarrSeries) {
        for (const title of series.titles) {
            const closestMatch = findClosestMatch(title, animeTitles);
    
            if (closestMatch) {
                const anime = await prisma.anime.findFirst({
                    where: { title: closestMatch },
                });
    
                if (!anime) {
                    console.log(`No MAL anime found for the title ${closestMatch}`);
                    continue;
                }
    
                if (anime) {
                    const id = series.id;
                    
                    await prisma.sonarrSeries.update({
                        where: { id },
                        data: { malId: anime.malId }
                    });
                }
            }
        }
    }


    if (uniqueToMal.length > 0) {
        if (diff === 'true') {
            return NextResponse.json({ diff: uniqueToMal, lists: { mal: animeTitles, sonarr: sonarrTitles } });
        } else {
            const tvdbidApiKey = process.env.TVDBID_API_KEY;
            const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey);
            const rootFolder = await getSonarrRootFolder();
            const results = await addAnimeToSonarr(tvdbids, rootFolder[0]['path']);
            return NextResponse.json({ success: true, data: { results: results, diff: uniqueToMal, lists: { mal: animeTitles, sonarr: sonarrSeries } } }, { status: 200 });
        }
    }

    if (uniqueToSonarr.length > 0) {
        return NextResponse.json({ message: 'Your Sonarr is out of sync, please resolve manually' }, { status: 400 });
    }

    if (uniqueToMal.length === 0 && uniqueToSonarr.length === 0) {
        return NextResponse.json({ message: 'Everything is already synced!' }, { status: 200 });
    }

    if (diff === 'true') {
        return NextResponse.json({ diff: uniqueToMal, lists: { mal: animeTitles, sonarr: sonarrSeries } });
    }

    const tvdbidApiKey = process.env.TVDBID_API_KEY;

    if (!tvdbidApiKey) {
        return NextResponse.json({ message: 'TVDB API key is missing.' }, { status: 500 });
    }

    const tvdbids = await getTvdbIds(uniqueToMal, tvdbidApiKey);
    const rootFolder = await getSonarrRootFolder();

    const results = await addAnimeToSonarr(tvdbids, rootFolder[0]['path']);

    return NextResponse.json({
        success: true,
        message: results,
        data: { diff: uniqueToMal, lists: { mal: animeTitles, sonarr: sonarrSeries } }
    }, { status: 200 });
}
