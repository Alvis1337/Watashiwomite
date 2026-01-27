/**
 * Tests for Batch Actions
 */

describe('Batch Actions Utilities', () => {
  describe('Array Chunking', () => {
    function chunk<T>(array: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    }

    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const result = chunk(arr, 2);
      
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('should handle uneven chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = chunk(arr, 2);
      
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle single element chunks', () => {
      const arr = [1, 2, 3];
      const result = chunk(arr, 1);
      
      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should handle empty array', () => {
      const result = chunk([], 5);
      
      expect(result).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2, 3];
      const result = chunk(arr, 10);
      
      expect(result).toEqual([[1, 2, 3]]);
    });
  });

  describe('Batch Processing', () => {
    async function processBatch<T, R>(
      items: T[],
      batchSize: number,
      processor: (batch: T[]) => Promise<R[]>
    ): Promise<R[]> {
      const results: R[] = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);
      }
      
      return results;
    }

    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn().mockImplementation((batch: number[]) => 
        Promise.resolve(batch.map(n => n * 2))
      );

      const result = await processBatch(items, 2, processor);

      expect(result).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(3); // 2+2+1
    });

    it('should handle empty input', async () => {
      const processor = jest.fn().mockResolvedValue([]);

      const result = await processBatch([], 5, processor);

      expect(result).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should handle processor errors', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn().mockRejectedValue(new Error('Process failed'));

      await expect(processBatch(items, 2, processor)).rejects.toThrow('Process failed');
    });

    it('should process batches sequentially', async () => {
      const items = [1, 2, 3, 4];
      const order: number[] = [];
      
      const processor = async (batch: number[]) => {
        order.push(...batch);
        return batch;
      };

      await processBatch(items, 2, processor);

      expect(order).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Rate-Limited Batch Processing', () => {
    async function rateLimitedBatch<T, R>(
      items: T[],
      batchSize: number,
      delayMs: number,
      processor: (batch: T[]) => Promise<R[]>
    ): Promise<R[]> {
      const results: R[] = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);
      }
      
      return results;
    }

    it('should add delay between batches', async () => {
      const items = [1, 2, 3, 4];
      const processor = jest.fn().mockImplementation((batch: number[]) => 
        Promise.resolve(batch)
      );

      const start = Date.now();
      await rateLimitedBatch(items, 2, 50, processor);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50); // At least one delay
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('should not delay before first batch', async () => {
      const items = [1, 2];
      const processor = jest.fn().mockImplementation((batch: number[]) => 
        Promise.resolve(batch)
      );

      const start = Date.now();
      await rateLimitedBatch(items, 10, 1000, processor);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // No 1000ms delay
    });
  });

  describe('Progress Tracking', () => {
    async function batchWithProgress<T, R>(
      items: T[],
      batchSize: number,
      processor: (batch: T[]) => Promise<R[]>,
      onProgress?: (processed: number, total: number) => void
    ): Promise<R[]> {
      const results: R[] = [];
      let processed = 0;
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);
        
        processed += batch.length;
        if (onProgress) {
          onProgress(processed, items.length);
        }
      }
      
      return results;
    }

    it('should report progress', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn().mockImplementation((batch: number[]) => 
        Promise.resolve(batch)
      );
      const onProgress = jest.fn();

      await batchWithProgress(items, 2, processor, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, 2, 5);
      expect(onProgress).toHaveBeenNthCalledWith(2, 4, 5);
      expect(onProgress).toHaveBeenNthCalledWith(3, 5, 5);
    });

    it('should work without progress callback', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn().mockImplementation((batch: number[]) => 
        Promise.resolve(batch)
      );

      const result = await batchWithProgress(items, 2, processor);

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('Error Recovery', () => {
    async function batchWithRetry<T, R>(
      items: T[],
      batchSize: number,
      processor: (batch: T[]) => Promise<R[]>,
      maxRetries: number = 3
    ): Promise<{ success: R[]; failed: T[] }> {
      const success: R[] = [];
      const failed: T[] = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        let attempts = 0;
        let succeeded = false;
        
        while (attempts < maxRetries && !succeeded) {
          try {
            const results = await processor(batch);
            success.push(...results);
            succeeded = true;
          } catch (error) {
            attempts++;
            if (attempts >= maxRetries) {
              failed.push(...batch);
            }
          }
        }
      }
      
      return { success, failed };
    }

    it('should retry failed batches', async () => {
      let attempts = 0;
      const processor = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('Fail'));
        }
        return Promise.resolve([1, 2]);
      });

      const result = await batchWithRetry([1, 2], 2, processor, 3);

      expect(result.success).toEqual([1, 2]);
      expect(result.failed).toEqual([]);
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('should collect failed items after max retries', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await batchWithRetry([1, 2, 3], 2, processor, 2);

      expect(result.success).toEqual([]);
      expect(result.failed).toEqual([1, 2, 3]);
      expect(processor).toHaveBeenCalledTimes(4); // 2 batches * 2 retries
    });
  });
});
