import prisma from '../../../../lib/prisma'
import { NextRequest, NextResponse } from "next/server";

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