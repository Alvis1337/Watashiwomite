/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, parseBody } from '@/lib/api-helpers';

describe('API Helpers', () => {
  describe('successResponse()', () => {
    it('should create success response with data', async () => {
      const response = successResponse({ id: 1, name: 'Test' });
      const json = await response.json();
      
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should include optional message', async () => {
      const response = successResponse({ id: 1 }, 'Operation successful');
      const json = await response.json();
      
      expect(json.success).toBe(true);
      expect(json.message).toBe('Operation successful');
    });

    it('should handle different data types', async () => {
      const response1 = successResponse('string');
      const json1 = await response1.json();
      expect(json1.data).toBe('string');

      const response2 = successResponse(42);
      const json2 = await response2.json();
      expect(json2.data).toBe(42);

      const response3 = successResponse([1, 2, 3]);
      const json3 = await response3.json();
      expect(json3.data).toEqual([1, 2, 3]);
    });
  });

  describe('errorResponse()', () => {
    it('should create error response with default status 500', async () => {
      const response = errorResponse('Something went wrong');
      const json = await response.json();
      
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe('Something went wrong');
    });

    it('should accept custom status codes', async () => {
      const response404 = errorResponse('Not found', 404);
      expect(response404.status).toBe(404);

      const response400 = errorResponse('Bad request', 400);
      expect(response400.status).toBe(400);

      const response401 = errorResponse('Unauthorized', 401);
      expect(response401.status).toBe(401);
    });

    it('should include optional error details', async () => {
      const response = errorResponse('Validation failed', 400, 'Email is required');
      const json = await response.json();
      
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Email is required');
    });
  });

  describe('parseBody()', () => {
    it('should parse valid JSON body', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ name: 'Test', value: 123 }),
      } as unknown as NextRequest;

      const result = await parseBody(mockRequest);
      
      expect(result).toEqual({ name: 'Test', value: 123 });
    });

    it('should return null for invalid JSON', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const result = await parseBody(mockRequest);
      
      expect(result).toBeNull();
    });

    it('should handle empty body', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      const result = await parseBody(mockRequest);
      
      expect(result).toEqual({});
    });
  });
});
