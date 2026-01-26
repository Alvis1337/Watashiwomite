import { NextRequest, NextResponse } from 'next/server';
import { getSyncHistory } from '../../../../utils/syncHistory';

/**
 * @swagger
 * /api/sync/history:
 *   get:
 *     summary: Get sync history for user
 *     description: Returns list of past sync operations with details
 *     tags:
 *       - Sync
 *     parameters:
 *       - name: username
 *         in: query
 *         required: true
 *         description: Username to fetch history for
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of entries to return
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Sync history retrieved successfully
 *       400:
 *         description: Username is required
 *       500:
 *         description: Failed to fetch history
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!username) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      );
    }

    const history = await getSyncHistory(username, limit);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('[SyncHistory API] Error:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch sync history',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
