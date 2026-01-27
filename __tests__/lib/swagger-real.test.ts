/**
 * Real tests for lib/swagger.ts
 * Tests Swagger API documentation generation
 */

jest.mock('next-swagger-doc', () => ({
  createSwaggerSpec: jest.fn(),
}));

import { getApiDocs } from '@/lib/swagger';
import { createSwaggerSpec } from 'next-swagger-doc';

const mockCreateSwaggerSpec = createSwaggerSpec as jest.MockedFunction<typeof createSwaggerSpec>;

describe('Swagger - REAL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call createSwaggerSpec with correct config', async () => {
    const mockSpec = { openapi: '3.0.0', info: { title: 'Test', version: '1.0' } };
    mockCreateSwaggerSpec.mockReturnValue(mockSpec);

    const result = await getApiDocs();

    expect(mockCreateSwaggerSpec).toHaveBeenCalledWith({
      apiFolder: 'app/api',
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Watashiwomite',
          version: '1.0',
        },
        components: {
          securitySchemes: {
            MalBearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            SonarrApiKey: {
              type: 'apiKey',
              name: 'NA',
              in: 'URL',
              description: 'Sonarr API Key',
            },
            TVDBApiKey: {
              type: 'apiKey',
              name: 'NA',
              in: 'Used to get token',
              description: 'TVDB API Key',
            },
          },
        },
        security: [
          {
            MalBearerAuth: [],
          },
          {
            SonarrApiKey: [],
          },
          {
            TVDBApiKey: [],
          },
        ],
      },
    });
    expect(result).toEqual(mockSpec);
  });

  it('should return the swagger spec object', async () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Watashiwomite', version: '1.0' },
      paths: {},
    };
    mockCreateSwaggerSpec.mockReturnValue(mockSpec);

    const result = await getApiDocs();

    expect(result).toEqual(mockSpec);
  });
});
