import { getSonarrAnimeList} from "@/utils/utils";
import {NextResponse } from "next/server";

export async function GET() {
    try{
        const sonarrList = await getSonarrAnimeList()
        return NextResponse.json({sonarrList})
    } catch (e) {
        console.error(e)
        return NextResponse.json({message: 'Failed to fetch list from Sonarr'}, {status: 500})
    }
}