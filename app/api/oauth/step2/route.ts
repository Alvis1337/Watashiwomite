import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { serialize } from 'cookie';

const clientId = process.env.MAL_CLIENT_ID;
const clientSecret = process.env.MAL_CLIENT_SECRET;
const redirectUri = process.env.MAL_REDIRECT_URI;
const tokenEndpoint = 'https://myanimelist.net/v1/oauth2/token';

/**
 * @swagger
 * /api/oauth/step2:
 *   get:
 *     summary: Handles the OAuth 2.0 token exchange for MyAnimeList.
 *     description: Exchanges the authorization code for an access token, stores it in the database, and sets the token as a cookie.
 *     tags:
 *       - OAuth
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         description: The authorization code received from MyAnimeList after user authentication.
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to the home page after successfully obtaining and storing the token.
 *         headers:
 *           Set-Cookie:
 *             description: The access token is set as a secure HTTP-only cookie.
 *             schema:
 *               type: string
 *               example: authToken=abcd1234; HttpOnly; Secure; Path=/; Max-Age=3600
 *       400:
 *         description: Missing authorization code or code verifier.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Missing authorization code
 *       500:
 *         description: An error occurred during the token exchange process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to obtain token
 */

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

            const serializedCookie = serialize('authToken', tokenData.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', 
                maxAge: tokenData.expires_in,
                path: '/'
            });

            const headers = new Headers();
            headers.append('Set-Cookie', serializedCookie);

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
