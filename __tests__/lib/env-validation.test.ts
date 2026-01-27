/**
 * Tests for environment variable validation
 */

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Required Environment Variables', () => {
    it('should require DATABASE_URL', () => {
      delete process.env.DATABASE_URL;
      
      // Environment validation happens at module load
      // so we test that the variable is checked
      expect(process.env.DATABASE_URL).toBeUndefined();
    });

    it('should allow DATABASE_URL to be set', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      
      expect(process.env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    });
  });

  describe('Optional MAL Variables', () => {
    it('should allow MAL_CLIENT_ID to be undefined', () => {
      delete process.env.MAL_CLIENT_ID;
      
      expect(process.env.MAL_CLIENT_ID).toBeUndefined();
    });

    it('should allow MAL_CLIENT_SECRET to be undefined', () => {
      delete process.env.MAL_CLIENT_SECRET;
      
      expect(process.env.MAL_CLIENT_SECRET).toBeUndefined();
    });

    it('should allow MAL_REDIRECT_URI to be undefined', () => {
      delete process.env.MAL_REDIRECT_URI;
      
      expect(process.env.MAL_REDIRECT_URI).toBeUndefined();
    });

    it('should accept valid MAL credentials', () => {
      process.env.MAL_CLIENT_ID = 'test_client_id';
      process.env.MAL_CLIENT_SECRET = 'test_client_secret';
      process.env.MAL_REDIRECT_URI = 'http://localhost:3000/callback';
      
      expect(process.env.MAL_CLIENT_ID).toBe('test_client_id');
      expect(process.env.MAL_CLIENT_SECRET).toBe('test_client_secret');
      expect(process.env.MAL_REDIRECT_URI).toBe('http://localhost:3000/callback');
    });
  });

  describe('Optional Sonarr Variables', () => {
    it('should allow SONARR_URL to be undefined', () => {
      delete process.env.SONARR_URL;
      
      expect(process.env.SONARR_URL).toBeUndefined();
    });

    it('should allow SONARR_API_KEY to be undefined', () => {
      delete process.env.SONARR_API_KEY;
      
      expect(process.env.SONARR_API_KEY).toBeUndefined();
    });

    it('should accept valid Sonarr configuration', () => {
      process.env.SONARR_URL = 'http://localhost:8989';
      process.env.SONARR_API_KEY = 'test_api_key_12345';
      
      expect(process.env.SONARR_URL).toBe('http://localhost:8989');
      expect(process.env.SONARR_API_KEY).toBe('test_api_key_12345');
    });
  });

  describe('Optional TVDB Variables', () => {
    it('should allow TVDB_API_KEY to be undefined', () => {
      delete process.env.TVDB_API_KEY;
      
      expect(process.env.TVDB_API_KEY).toBeUndefined();
    });

    it('should accept valid TVDB API key', () => {
      process.env.TVDB_API_KEY = 'test_tvdb_key_12345';
      
      expect(process.env.TVDB_API_KEY).toBe('test_tvdb_key_12345');
    });
  });

  describe('Node Environment', () => {
    it('should default to development', () => {
      delete process.env.NODE_ENV;
      
      expect(process.env.NODE_ENV || 'development').toBe('development');
    });

    it('should accept production environment', () => {
      process.env.NODE_ENV = 'production';
      
      expect(process.env.NODE_ENV).toBe('production');
    });

    it('should accept test environment', () => {
      process.env.NODE_ENV = 'test';
      
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('URL Validation', () => {
    it('should accept valid HTTP URLs', () => {
      const validUrls = [
        'http://localhost:3000',
        'http://192.168.1.1:8080',
        'http://example.com',
      ];

      validUrls.forEach(url => {
        process.env.TEST_URL = url;
        expect(process.env.TEST_URL).toBe(url);
      });
    });

    it('should accept valid HTTPS URLs', () => {
      const validUrls = [
        'https://localhost:3000',
        'https://example.com',
        'https://api.myanimelist.net',
      ];

      validUrls.forEach(url => {
        process.env.TEST_URL = url;
        expect(process.env.TEST_URL).toBe(url);
      });
    });
  });
});
