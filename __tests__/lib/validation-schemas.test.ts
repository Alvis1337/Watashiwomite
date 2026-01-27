import { z } from 'zod';
import {
  formatZodError,
  validateQueryParams,
  validateRequestBody,
  usernameQuerySchema,
  oauthStep1Schema,
  oauthStep2Schema,
} from '@/lib/validation-schemas';

describe('Validation Schemas', () => {
  describe('usernameQuerySchema', () => {
    it('should accept valid username', () => {
      const result = usernameQuerySchema.parse({ username: 'testuser' });
      expect(result.username).toBe('testuser');
    });

    it('should reject empty username', () => {
      expect(() => usernameQuerySchema.parse({ username: '' })).toThrow();
    });

    it('should reject missing username', () => {
      expect(() => usernameQuerySchema.parse({})).toThrow();
    });
  });

  describe('oauthStep1Schema', () => {
    it('should accept valid username', () => {
      const result = oauthStep1Schema.parse({ username: 'testuser' });
      expect(result.username).toBe('testuser');
    });

    it('should reject username over 100 characters', () => {
      const longUsername = 'a'.repeat(101);
      expect(() => oauthStep1Schema.parse({ username: longUsername })).toThrow();
    });

    it('should accept username exactly 100 characters', () => {
      const username = 'a'.repeat(100);
      expect(() => oauthStep1Schema.parse({ username })).not.toThrow();
    });
  });

  describe('oauthStep2Schema', () => {
    it('should accept valid oauth data', () => {
      const data = {
        code: 'auth_code_12345',
        state: 'random_state',
        username: 'testuser',
      };
      
      const result = oauthStep2Schema.parse(data);
      expect(result).toEqual(data);
    });

    it('should accept oauth data without state', () => {
      const data = {
        code: 'auth_code_12345',
        username: 'testuser',
      };
      
      expect(() => oauthStep2Schema.parse(data)).not.toThrow();
    });

    it('should reject missing code', () => {
      expect(() =>
        oauthStep2Schema.parse({ username: 'testuser' })
      ).toThrow();
    });

    it('should reject empty code', () => {
      expect(() =>
        oauthStep2Schema.parse({ code: '', username: 'testuser' })
      ).toThrow();
    });
  });



  describe('validateQueryParams()', () => {
    it('should validate query parameters', () => {
      const searchParams = new URLSearchParams({ username: 'testuser' });
      const result = validateQueryParams(searchParams, usernameQuerySchema);
      
      expect(result.username).toBe('testuser');
    });

    it('should handle multiple query parameters', () => {
      const searchParams = new URLSearchParams({
        username: 'testuser',
        diff: 'true',
      });
      
      const schema = z.object({
        username: z.string(),
        diff: z.string().optional(),
      });
      
      const result = validateQueryParams(searchParams, schema);
      expect(result.username).toBe('testuser');
      expect(result.diff).toBe('true');
    });

    it('should throw on invalid parameters', () => {
      const searchParams = new URLSearchParams({ username: '' });
      
      expect(() => validateQueryParams(searchParams, usernameQuerySchema)).toThrow();
    });
  });

  describe('validateRequestBody()', () => {
    it('should validate request body', () => {
      const body = { username: 'testuser' };
      const result = validateRequestBody(body, oauthStep1Schema);
      
      expect(result.username).toBe('testuser');
    });

    it('should throw on invalid body', () => {
      const body = { username: '' };
      
      expect(() => validateRequestBody(body, oauthStep1Schema)).toThrow();
    });

    it('should handle complex objects', () => {
      const body = {
        code: 'auth123',
        state: 'state123',
        username: 'testuser',
      };
      
      const result = validateRequestBody(body, oauthStep2Schema);
      expect(result).toEqual(body);
    });
  });

  describe('formatZodError()', () => {
    it('should format single validation error', () => {
      const schema = z.object({
        name: z.string(),
      });

      try {
        schema.parse({ name: 123 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodError(error);
          expect(formatted).toContain('name');
          expect(typeof formatted).toBe('string');
        }
      }
    });

    it('should format multiple validation errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      try {
        schema.parse({
          name: 123,
          age: 'not a number',
          email: 'invalid-email',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodError(error);
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle nested object errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      try {
        schema.parse({
          user: {
            name: 123,
            age: 'not a number',
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodError(error);
          expect(typeof formatted).toBe('string');
        }
      }
    });
  });
});
