import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { addAnimeToSonarr } from '../../../../utils/utils';
import { getTvdbIds } from '@/utils/updatedUtils';

const tvdbidApiKey = process.env.TVDBID_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const username = req.query.username as string;

    const animeListObject = await prisma.animeList.findUnique({
        where: { username },
        include: { anime: true }
      });      

    if (!animeListObject) {
        res.status(404).json({ message: 'No list found for this username' });
        return;
    }

    if(tvdbidApiKey) {
        const tvdbIds = await getTvdbIds(animeListObject.anime, tvdbidApiKey);
        tvdbIds.forEach((item) => {
            console.log('adding anime to sonarr:', item.title, item.tvdbId);
            addAnimeToSonarr(item.title, item.tvdbId);
        });
    
        res.status(200).json(tvdbIds);
    } else {
        res.status(400).json({message: 'No api key provided for tvdb'})
    }
    
}
