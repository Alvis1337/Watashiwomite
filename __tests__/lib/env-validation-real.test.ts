import { validateEnv, getEnv, runStartupValidation } from '@/lib/env-validation';

describe('Environment Validation - REAL', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv()', () => {
    it('should validate valid environment', () => {
      process.env.POSTGRES_PRISMA_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:pass@localhost:5432/db';

      const result = validateEnv();

      expect(result.POSTGRES_PRISMA_URL).toBe('postgresql://user:pass@localhost:5432/db');
      expect(result.POSTGRES_URL_NON_POOLING).toBe('postgresql://user:pass@localhost:5432/db');
    });

    it('should allow optional variables', () => {
      process.env.POSTGRES_PRISMA_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:pass@localhost:5432/db';
      process.env.MAL_CLIENT_ID = 'test-client-id';
      process.env.SONARR_URL = 'http://localhost:8989';

      const result = validateEnv();

      expect(result.MAL_CLIENT_ID).toBe('test-client-id');
      expect(result.SONARR_URL).toBe('http://localhost:8989');
    });

    it('should throw on invalid database URL', () => {
      process.env.POSTGRES_PRISMA_URL = 'not-a-url';
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:pass@localhost:5432/db';

      expect(() => validateEnv()).toThrow('Invalid environment configuration');
    });

    it('should throw on missing required variables', () => {
      delete process.env.POSTGRES_PRISMA_URL;

      expect(() => validateEnv()).toThrow('Invalid environment configuration');
    });
  });

  describe('getEnv()', () => {
    it('should return validated environment', () => {
      process.env.POSTGRES_PRISMA_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:pass@localhost:5432/db';

      const result = getEnv();

      expect(result.POSTGRES_PRISMA_URL).toBeDefined();
    });
  });

  describe('runStartupValidation()', () => {
    it('should run without errors on valid env', () => {
      process.env.POSTGRES_PRISMA_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:pass@localhost:5432/db';

      expect(() => runStartupValidation()).not.toThrow();
    });

    it('should warn about missing optional variables', () => {
      process.env.POSTGRES_PRISMA_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.POSTGRES_URL_NON_POOLING = 'postgresql://user:pass@localhost:5432/db';
      delete process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.NODE_ENV;

      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      runStartupValidation();

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('should throw on invalid environment', () => {
      delete process.env.POSTGRES_PRISMA_URL;

      expect(() => runStartupValidation()).toThrow();
    });
  });
});
