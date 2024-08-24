// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function GET(req: NextRequest) {
    try {
        const cookie = serialize('authToken', '', {
            maxAge: -1, 
            path: '/',
        });

        return NextResponse.redirect(new URL('/', req.url), { headers: {
                'Set-Cookie': cookie,
            },
        });
    } catch (error) {
        console.error('Logout failed:', error);
        return NextResponse.json({ message: 'Failed to log out' }, { status: 500 });
    }
}
