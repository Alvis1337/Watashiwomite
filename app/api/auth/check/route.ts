import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';

export async function GET(req: NextRequest) {
    const cookies = parse(req.headers.get('cookie') || '');
    const accessToken = cookies['authToken']

    if (!accessToken) {
        return NextResponse.json({ isAuthenticated: false, user: null });
    }

    try {
        const userResponse = await fetch('https://api.myanimelist.net/v2/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userResponse.ok) {
            return NextResponse.json({ isAuthenticated: false, user: null });
        }

        const userData = await userResponse.json();
        return NextResponse.json({ isAuthenticated: true, user: userData, authToken: accessToken });
    } catch (error) {
        console.error('Failed to verify token:', error);
        return NextResponse.json({ isAuthenticated: false, user: null });
    }
}
