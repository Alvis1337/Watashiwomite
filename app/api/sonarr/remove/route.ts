import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

/**
 * @swagger
 * /api/sonarr/remove:
 *   post:
 *     summary: Remove anime from Sonarr by MAL IDs
 *     description: Removes specified anime series from Sonarr based on their MAL IDs
 *     tags:
 *       - Sonarr
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               malIds:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       200:
 *         description: Anime removed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to remove anime
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, malIds } = body;

    if (!username || !malIds || !Array.isArray(malIds)) {
      return NextResponse.json({ message: 'Username and malIds array required' }, { status: 400 });
    }

    if (malIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No anime to remove',
        removed: 0,
      });
    }

    const sonarrUrl = process.env.SONARR_URL;
    const sonarrApiKey = process.env.SONARR_API_KEY;

    if (!sonarrUrl || !sonarrApiKey) {
      return NextResponse.json({ message: 'Sonarr configuration missing' }, { status: 500 });
    }

    // Get user's Sonarr series that match the MAL IDs
    const userList = await prisma.animeList.findUnique({
      where: { username },
      include: {
        sonarrSeries: {
          where: {
            malId: {
              in: malIds,
            },
          },
        },
      },
    });

    if (!userList?.sonarrSeries || userList.sonarrSeries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching anime found in Sonarr',
        removed: 0,
      });
    }

    const results = [];
    let removedCount = 0;

    // Remove each series from Sonarr
    for (const series of userList.sonarrSeries) {
      try {
        const deleteUrl = `${sonarrUrl}/api/v3/series/${series.id}?deleteFiles=true`;

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'X-Api-Key': sonarrApiKey,
          },
        });

        if (response.ok) {
          removedCount++;

          // Also remove from our database
          await prisma.sonarrSeries.delete({
            where: { id: series.id },
          });

          results.push({
            title: series.title,
            malId: series.malId,
            success: true,
          });
        } else {
          console.error(`Failed to remove ${series.title} from Sonarr`);
          results.push({
            title: series.title,
            malId: series.malId,
            success: false,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        console.error(`Error removing ${series.title}:`, error);
        results.push({
          title: series.title,
          malId: series.malId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${removedCount} of ${malIds.length} anime from Sonarr`,
      removed: removedCount,
      results,
    });
  } catch (error) {
    console.error('Error removing anime from Sonarr:', error);
    return NextResponse.json(
      {
        message: 'Failed to remove anime',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
