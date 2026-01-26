import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the application and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: connected
 *                     api:
 *                       type: string
 *                       example: operational
 *       503:
 *         description: Service is unhealthy
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp,
      services: {
        database: 'connected',
        api: 'operational',
      },
      version: process.env.npm_package_version || '0.1.0',
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        services: {
          database: 'disconnected',
          api: 'operational',
        },
        error: 'Database connection failed',
      },
      { status: 503 }
    );
  }
}
