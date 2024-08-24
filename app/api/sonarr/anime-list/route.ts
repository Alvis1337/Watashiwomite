import { getSonarrAnimeList, saveSonarrSeries } from "@/utils/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    try{
        const sonarrList = await getSonarrAnimeList()
        const saveList = await saveSonarrSeries(username, sonarrList)
        return NextResponse.json({saveList})
    } catch (e) {
        console.error(e)
        return NextResponse.json({message: 'Failed to fetch list from Sonarr'}, {status: 500})
    }
}