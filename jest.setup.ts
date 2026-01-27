import '@testing-library/jest-dom';

// Mock environment variables
process.env.POSTGRES_PRISMA_URL = 'postgresql://test:test@localhost:5432/test';
process.env.POSTGRES_URL_NON_POOLING = 'postgresql://test:test@localhost:5432/test';
