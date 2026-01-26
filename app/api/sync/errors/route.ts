import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

/**
 * @swagger
 * /api/sync/errors:
 *   get:
 *     summary: Get sync errors for a user
 *     description: Retrieves anime that failed to sync for a specific user
 *     tags:
 *       - Sync
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username to fetch sync errors for
 *     responses:
 *       200:
 *         description: List of sync errors
 *       400:
 *         description: Missing username
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ message: 'Username is required' }, { status: 400 });
    }

    const errors = await prisma.syncError.findMany({
      where: {
        username,
        resolved: false,
      },
      orderBy: {
        lastAttempt: 'desc',
      },
    });

    return NextResponse.json({ errors });
  } catch (error) {
    console.error('[SyncErrors] Failed to fetch sync errors:', error);
    return NextResponse.json({ message: 'Failed to fetch sync errors' }, { status: 500 });
  }
}

/**
 * Clear/resolve a sync error
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const malId = searchParams.get('malId');

    if (!username || !malId) {
      return NextResponse.json({ message: 'Username and malId are required' }, { status: 400 });
    }

    await prisma.syncError.update({
      where: {
        username_malId: {
          username,
          malId: parseInt(malId),
        },
      },
      data: {
        resolved: true,
      },
    });

    return NextResponse.json({ message: 'Error marked as resolved' });
  } catch (error) {
    console.error('[SyncErrors] Failed to resolve sync error:', error);
    return NextResponse.json({ message: 'Failed to resolve sync error' }, { status: 500 });
  }
}
