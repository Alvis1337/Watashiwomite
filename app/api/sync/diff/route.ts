import { NextRequest, NextResponse } from "next/server";
import prisma from '../../../../lib/prisma';
import { addAnimeToSonarr } from '../../../../utils/updatedUtils';
import { getTvdbIds } from '@/utils/utils';

const tvdbidApiKey = process.env.TVDBID_API_KEY;

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const username = url.searchParams.get('username')

    if (!username) {
        return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
    }
    const animeListObject = await prisma.animeList.findUnique({
        where: { username },
        include: { anime: true }
      });      

    if (!animeListObject) {
        return NextResponse.json({ message: 'No list found for this username.' }, { status: 400 });
    }

    if(tvdbidApiKey) {
        const tvdbIds = await getTvdbIds(animeListObject.anime, tvdbidApiKey);
        tvdbIds.forEach((item) => {
            addAnimeToSonarr(item.title, item.tvdbId);
        });

    
        return NextResponse.json({tvdbIds}, {status: 200})
    } else {
        return NextResponse.json({message: 'No api key provided for tvdb'}, {status: 400})        
    }
    
}
