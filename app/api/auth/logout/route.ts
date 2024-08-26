import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logs the user out by clearing the authentication token.
 *     description: Clears the `authToken` cookie and redirects the user to the homepage.
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirects to the homepage after successful logout.
 *         headers:
 *           Set-Cookie:
 *             description: Clears the `authToken` cookie by setting a negative maxAge.
 *             schema:
 *               type: string
 *               example: "authToken=; Max-Age=-1; Path=/"
 *       500:
 *         description: Logout failed due to an internal error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message for the failed logout.
 *                   example: "Failed to log out"
 */
export async function GET(req: NextRequest) {
    try {
        const cookie = serialize('authToken', '', {
            maxAge: -1, 
            path: '/',
        });

        return NextResponse.redirect(new URL('/', req.url), {
            headers: {
                'Set-Cookie': cookie,
            },
        });
    } catch (error) {
        console.error('Logout failed:', error);
        return NextResponse.json({ message: 'Failed to log out' }, { status: 500 });
    }
}
