import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';

const clientId = process.env.MAL_CLIENT_ID;
const redirectUri = process.env.MAL_REDIRECT_URI;
const authorizationEndpoint = 'https://myanimelist.net/v1/oauth2/authorize';

function generateCodeVerifier(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url');
}

function generateCodeChallenge(codeVerifier: string): string {
    return codeVerifier
}

/**
 * @swagger
 * /api/oauth/step1:
 *   get:
 *     summary: Starts the OAuth 2.0 authorization process for MyAnimeList.
 *     description: Generates a code verifier for PKCE, stores it, and returns the authorization URL with the generated code challenge.
 *     tags:
 *       - OAuth
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         description: The MyAnimeList username initiating the OAuth process.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully generated the authorization URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorizationUrl:
 *                   type: string
 *                   description: The authorization URL for MyAnimeList OAuth.
 *                   example: https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=your_client_id&redirect_uri=your_redirect_uri&code_challenge=your_code_challenge&code_challenge_method=plain
 *       400:
 *         description: Missing required client ID, redirect URI, or username.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No client ID or redirect URI specified
 *       500:
 *         description: An error occurred during the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: An error occurred.
 */

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');

    if (!username) {
        return NextResponse.json({ message: 'Username is required' }, { status: 400 });
    }

    try {
        const existingCodeRecord = await prisma.oAuthState.findUnique({ where: { username } });

        let codeVerifier: string;
        if (existingCodeRecord) {
            codeVerifier = existingCodeRecord.codeVerifier;
        } else {
            codeVerifier = generateCodeVerifier(64);
            await prisma.oAuthState.create({
                data: {
                    username,
                    codeVerifier,
                },
            });
        }

        const codeChallenge = generateCodeChallenge(codeVerifier);

        if (clientId && redirectUri) {
            const authorizationUrl = new URL(authorizationEndpoint);
            authorizationUrl.searchParams.append('response_type', 'code');
            authorizationUrl.searchParams.append('client_id', clientId);
            authorizationUrl.searchParams.append('redirect_uri', redirectUri);
            authorizationUrl.searchParams.append('code_challenge', codeChallenge);
            authorizationUrl.searchParams.append('code_challenge_method', 'plain');

            return NextResponse.json({ authorizationUrl });
        } else {
            return NextResponse.json({ message: 'No client ID or redirect URI specified' }, { status: 400 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'An error occurred.' }, { status: 500 });
    }
}
