// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function GET(req: NextRequest) {
    try {
        // Clear the authentication cookie
        const cookie = serialize('authToken', '', {
            maxAge: -1, // Set the cookie to expire immediately
            path: '/',
        });

        // Create a response to indicate successful logout
        return NextResponse.redirect(new URL('/', req.url), { headers: {
                'Set-Cookie': cookie,
            },
        });
    } catch (error) {
        console.error('Logout failed:', error);
        return NextResponse.json({ message: 'Failed to log out' }, { status: 500 });
    }
}
