const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * CacheService (Item 111)
 * Standardized Redis caching layer with tenant isolation.
 */
class CacheService {
  constructor() {
    if (process.env.NODE_ENV === 'test' && !config.REDIS_URL.includes('localhost')) {
      // In CI tests, we might want to mock or use a local redis
    }
    
    try {
      this.client = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      });
      
      this.client.on('error', (err) => {
        if (process.env.NODE_ENV !== 'test') {
          logger.error('[REDIS] Connection Error:', err.message);
        }
      });
    } catch (err) {
      logger.error('[REDIS] Initialization Failed:', err.message);
    }
  }

  /**
   * Get tenant-scoped prefix
   */
  getPrefix(householdId) {
    if (!householdId) throw new Error('householdId is required for caching');
    return `hh:${householdId}:`;
  }

  /**
   * Fetch from cache
   */
  async get(householdId, key) {
    if (!this.client) return null;
    try {
      const data = await this.client.get(this.getPrefix(householdId) + key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn(`[CACHE] GET failed for ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Write to cache
   */
  async set(householdId, key, value, ttlSeconds = 3600) {
    if (!this.client) return;
    try {
      await this.client.set(
        this.getPrefix(householdId) + key,
        JSON.stringify(value),
        'EX',
        ttlSeconds
      );
    } catch (err) {
      logger.warn(`[CACHE] SET failed for ${key}:`, err.message);
    }
  }

  /**
   * Delete from cache
   */
  async del(householdId, key) {
    if (!this.client) return;
    try {
      await this.client.del(this.getPrefix(householdId) + key);
    } catch (err) {
      logger.warn(`[CACHE] DEL failed for ${key}:`, err.message);
    }
  }

  /**
   * Invalidate all keys for a household
   */
  async invalidateHousehold(householdId) {
    if (!this.client) return;
    const prefix = this.getPrefix(householdId);
    
    try {
      const stream = this.client.scanStream({
        match: `${prefix}*`,
        count: 100,
      });

      stream.on('data', async (keys) => {
        if (keys.length) {
          const pipeline = this.client.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec();
        }
      });
    } catch (err) {
      logger.error(`[CACHE] Invalidation failed for HH:${householdId}:`, err.message);
    }
  }
}

module.exports = new CacheService();
