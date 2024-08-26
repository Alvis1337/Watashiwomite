import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';

/**
 * @swagger
 * /api/auth/check:
 *   get:
 *     summary: Check if the user is authenticated with MyAnimeList.
 *     description: Validates the authentication token from cookies and retrieves user data from MyAnimeList if authenticated.
 *     tags:
 *       - Authentication
 *     security:
 *       - MalBearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the authentication status and user details if authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAuthenticated:
 *                   type: boolean
 *                   description: Indicates if the user is authenticated.
 *                   example: true
 *                 user:
 *                   type: object
 *                   description: User details retrieved from MyAnimeList.
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The user ID.
 *                       example: 6395883
 *                     name:
 *                       type: string
 *                       description: The username on MyAnimeList.
 *                       example: alvisleet
 *                     location:
 *                       type: string
 *                       description: User's location, if available.
 *                       example: ""
 *                     joined_at:
 *                       type: string
 *                       format: date-time
 *                       description: The date the user joined MyAnimeList.
 *                       example: "2017-07-12T23:47:12+00:00"
 *                     picture:
 *                       type: string
 *                       description: URL to the user's profile picture.
 *                       example: "https://cdn.myanimelist.net/s/common/userimages/8646381c-7fc7-42d0-8f99-1fbf2c1367d3_225w?s=55d4096c7a6ae1ab81c96891be98bd5a"
 *                 authToken:
 *                   type: string
 *                   description: The authentication token used for further API requests.
 *                   example: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImFkZmMyN..."
 *       401:
 *         description: Unauthorized - Token is missing or invalid.
 */
export async function GET(req: NextRequest) {
    const cookies = parse(req.headers.get('cookie') || '');
    const accessToken = cookies['authToken'];

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
