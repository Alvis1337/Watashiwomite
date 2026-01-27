import { getSettings, saveSettings, hasSettings } from '@/lib/settings';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    appSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Settings - REAL', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSettings()', () => {
    it('should return settings from database', async () => {
      mockPrisma.appSettings.findUnique.mockResolvedValue({
        id: 1,
        username: 'system',
        malClientId: 'db-client-id',
        malClientSecret: 'db-client-secret',
        malRedirectUri: 'http://localhost:3000/callback',
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: 'db-api-key',
        tvdbApiKey: 'db-tvdb-key',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSettings();

      expect(result.malClientId).toBe('db-client-id');
      expect(result.sonarrUrl).toBe('http://localhost:8989');
      expect(mockPrisma.appSettings.findUnique).toHaveBeenCalledWith({
        where: { username: 'system' },
      });
    });

    it('should fallback to env vars on database error', async () => {
      mockPrisma.appSettings.findUnique.mockRejectedValue(new Error('DB error'));
      process.env.MAL_CLIENT_ID = 'env-client-id';
      process.env.SONARR_URL = 'http://localhost:8989';
      process.env.TVDBID_API_KEY = 'env-tvdb-key';

      const result = await getSettings();

      expect(result.malClientId).toBe('env-client-id');
      expect(result.sonarrUrl).toBe('http://localhost:8989');
    });

    it('should fallback to env vars when database has incomplete data', async () => {
      mockPrisma.appSettings.findUnique.mockResolvedValue({
        id: 1,
        username: 'system',
        malClientId: null,
        malClientSecret: null,
        malRedirectUri: null,
        sonarrUrl: null,
        sonarrApiKey: null,
        tvdbApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      process.env.MAL_CLIENT_ID = 'env-client-id';
      process.env.TVDBID_API_KEY = 'env-tvdb-key';

      const result = await getSettings();

      expect(result.malClientId).toBe('env-client-id');
      expect(result.tvdbApiKey).toBe('env-tvdb-key');
    });
  });

  describe('saveSettings()', () => {
    it('should save settings to database', async () => {
      const settings = {
        malClientId: 'new-client-id',
        malClientSecret: 'new-secret',
        malRedirectUri: 'http://localhost:3000/callback',
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: 'new-api-key',
        tvdbApiKey: 'new-tvdb-key',
      };

      mockPrisma.appSettings.upsert.mockResolvedValue({
        id: 1,
        username: 'system',
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await saveSettings(settings);

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { username: 'system' },
        update: {
          ...settings,
          updatedAt: expect.any(Date),
        },
        create: {
          username: 'system',
          ...settings,
        },
      });
    });
  });

  describe('hasSettings()', () => {
    it('should return true when settings exist', async () => {
      mockPrisma.appSettings.findUnique.mockResolvedValue({
        id: 1,
        username: 'system',
        malClientId: 'test-id',
        malClientSecret: 'test-secret',
        malRedirectUri: 'http://localhost:3000/callback',
        sonarrUrl: 'http://localhost:8989',
        sonarrApiKey: 'test-key',
        tvdbApiKey: 'test-tvdb',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasSettings();

      expect(result).toBe(true);
      expect(mockPrisma.appSettings.findUnique).toHaveBeenCalled();
    });

    it('should return false when no settings exist', async () => {
      mockPrisma.appSettings.findUnique.mockResolvedValue(null);

      const result = await hasSettings();

      expect(result).toBe(false);
    });

    it('should return false when settings are incomplete', async () => {
      mockPrisma.appSettings.findUnique.mockResolvedValue({
        id: 1,
        username: 'system',
        malClientId: 'test-id',
        malClientSecret: null,
        malRedirectUri: null,
        sonarrUrl: null,
        sonarrApiKey: null,
        tvdbApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasSettings();

      expect(result).toBe(false);
    });
  });
});
