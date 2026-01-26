import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     description: Returns statistics about the current cache state
 *     tags:
 *       - Cache
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 size:
 *                   type: integer
 *                   description: Number of items in cache
 *                 hitRate:
 *                   type: number
 *                   description: Cache hit rate percentage
 */
export async function GET() {
  const stats = cache.stats();
  return NextResponse.json(stats);
}
