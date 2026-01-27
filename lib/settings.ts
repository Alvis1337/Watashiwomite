import prisma from './prisma';
import { z } from 'zod';

export const AppSettingsSchema = z.object({
  malClientId: z.string().min(1, 'MAL Client ID is required'),
  malClientSecret: z.string().min(1, 'MAL Client Secret is required'),
  malRedirectUri: z.string().url('Invalid MAL Redirect URI'),
  sonarrUrl: z.string().url('Invalid Sonarr URL'),
  sonarrApiKey: z.string().min(1, 'Sonarr API Key is required'),
  tvdbApiKey: z.string().min(1, 'TVDB API Key is required'),
});

export type AppSettingsType = z.infer<typeof AppSettingsSchema>;

/**
 * Get application settings (global for self-hosted instances)
 * Falls back to environment variables if not found in database
 */
export async function getSettings(): Promise<AppSettingsType> {
  try {
    // Try to get from database (using "system" as global username)
    const dbSettings = await prisma.appSettings.findUnique({
      where: { username: 'system' },
    });

    if (dbSettings && dbSettings.malClientId && dbSettings.sonarrUrl && dbSettings.tvdbApiKey) {
      return {
        malClientId: dbSettings.malClientId,
        malClientSecret: dbSettings.malClientSecret!,
        malRedirectUri: dbSettings.malRedirectUri!,
        sonarrUrl: dbSettings.sonarrUrl,
        sonarrApiKey: dbSettings.sonarrApiKey!,
        tvdbApiKey: dbSettings.tvdbApiKey,
      };
    }
  } catch (error) {
    console.error('[Settings] Error fetching from database:', error);
  }

  // Fallback to environment variables
  return {
    malClientId: process.env.MAL_CLIENT_ID || '',
    malClientSecret: process.env.MAL_CLIENT_SECRET || '',
    malRedirectUri: process.env.MAL_REDIRECT_URI || '',
    sonarrUrl: process.env.SONARR_URL || '',
    sonarrApiKey: process.env.SONARR_API_KEY || '',
    tvdbApiKey: process.env.TVDBID_API_KEY || '',
  };
}

/**
 * Check if global settings are configured
 */
export async function hasSettings(): Promise<boolean> {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { username: 'system' },
    });

    return !!(
      settings?.malClientId &&
      settings?.malClientSecret &&
      settings?.malRedirectUri &&
      settings?.sonarrUrl &&
      settings?.sonarrApiKey &&
      settings?.tvdbApiKey
    );
  } catch (error) {
    console.error('[Settings] Error checking settings:', error);
    return false;
  }
}

/**
 * Save global application settings
 */
export async function saveSettings(settings: AppSettingsType): Promise<void> {
  // Validate settings
  AppSettingsSchema.parse(settings);

  await prisma.appSettings.upsert({
    where: { username: 'system' },
    update: {
      malClientId: settings.malClientId,
      malClientSecret: settings.malClientSecret,
      malRedirectUri: settings.malRedirectUri,
      sonarrUrl: settings.sonarrUrl,
      sonarrApiKey: settings.sonarrApiKey,
      tvdbApiKey: settings.tvdbApiKey,
      updatedAt: new Date(),
    },
    create: {
      username: 'system',
      malClientId: settings.malClientId,
      malClientSecret: settings.malClientSecret,
      malRedirectUri: settings.malRedirectUri,
      sonarrUrl: settings.sonarrUrl,
      sonarrApiKey: settings.sonarrApiKey,
      tvdbApiKey: settings.tvdbApiKey,
    },
  });
}

/**
 * Delete global settings
 */
export async function deleteSettings(): Promise<void> {
  await prisma.appSettings.delete({
    where: { username: 'system' },
  });
}
