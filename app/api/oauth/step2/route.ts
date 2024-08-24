import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { serialize } from 'cookie';

const clientId = process.env.MAL_CLIENT_ID;
const clientSecret = process.env.MAL_CLIENT_SECRET;
const redirectUri = process.env.MAL_REDIRECT_URI;
const tokenEndpoint = 'https://myanimelist.net/v1/oauth2/token';

export async function GET(req: NextRequest) {
    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json({ message: "Missing environment variables" }, { status: 500 });
    }

    try {
        const url = new URL(req.url);
        const authorizationCode = url.searchParams.get('code');

        if (!authorizationCode) {
            return NextResponse.json({ message: "Missing authorization code" }, { status: 400 });
        }

        const codeRecord = await prisma.oAuthState.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        if (!codeRecord) {
            return NextResponse.json({ message: "Code verifier not found" }, { status: 400 });
        }

        const codeVerifier = codeRecord.codeVerifier;
        const tokenRequestBody = new URLSearchParams();
        tokenRequestBody.append('client_id', clientId);
        tokenRequestBody.append('client_secret', clientSecret);
        tokenRequestBody.append('code', authorizationCode);
        tokenRequestBody.append('redirect_uri', redirectUri);
        tokenRequestBody.append('grant_type', 'authorization_code');
        tokenRequestBody.append('code_verifier', codeVerifier);
        
        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenRequestBody.toString(),
        });
        const tokenData = await tokenResponse.json();

        if (tokenResponse.ok) {
            const accessToken = tokenData.access_token;
            const userResponse = await fetch('https://api.myanimelist.net/v2/users/@me', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }
            const userData = await userResponse.json();
            const username = userData.name;

            await prisma.malToken.upsert({
                where: { username },
                update: { token: tokenData.access_token },
                create: {
                    username,
                    token: tokenData.access_token,
                    refreshToken: tokenData.refresh_token
                }
            });

            // Set a cookie to indicate authentication
            const serializedCookie = serialize('authToken', tokenData.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                maxAge: tokenData.expires_in,
                path: '/'
            });

            const headers = new Headers();
            headers.append('Set-Cookie', serializedCookie);

            // Redirect to the home page
            return NextResponse.redirect(new URL('/', req.url), { headers });
        } else {
            console.error('Token request failed:', tokenData);
            return NextResponse.json({ message: 'Failed to obtain token' }, { status: 500 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'An error occurred.' }, { status: 500 });
    }
}
