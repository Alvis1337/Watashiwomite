import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/sonarr/config:
 *   get:
 *     summary: Get Sonarr configuration (public info only)
 *     description: Returns the Sonarr base URL for client-side link generation
 *     tags:
 *       - Sonarr
 *     responses:
 *       200:
 *         description: Sonarr configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sonarrUrl:
 *                   type: string
 *                   description: Base URL of the Sonarr instance
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const sonarrUrl = process.env.SONARR_URL;

    if (!sonarrUrl) {
      return NextResponse.json(
        { error: 'Sonarr URL not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sonarrUrl });
  } catch (error) {
    console.error('[Sonarr Config API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get Sonarr configuration' },
      { status: 500 }
    );
  }
}
