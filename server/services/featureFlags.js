const { db } = require('../db/index');
const { featureFlags } = require('../db/schema');
const { eq } = require('drizzle-orm');

/**
 * FeatureFlagService (Item 92)
 * Manages runtime feature toggles to decouple deployment from release.
 */
class FeatureFlagService {
  constructor() {
    this.cache = new Map();
    this.lastFetch = 0;
    this.CACHE_TTL = 60000; // 1 minute
  }

  async isEnabled(flagId, context = {}) {
    const flag = await this.getFlag(flagId);
    if (!flag) return false;
    if (!flag.isEnabled) return false;

    // Rollout percentage check (based on householdId or userId)
    if (flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100) {
      const idToHash = context.householdId || context.userId || 'anonymous';
      const hash = this.simpleHash(idToHash + flagId);
      if (hash % 100 >= flag.rolloutPercentage) return false;
    }

    // Criteria check (e.g. specific households)
    if (flag.criteria) {
      // Item 182: Soft Launch (Beta Rings)
      if (flag.criteria.beta_only && !context.isBetaUser) return false;

      if (flag.criteria.household_ids && context.householdId) {
        if (!flag.criteria.household_ids.includes(context.householdId)) return false;
      }
      if (flag.criteria.user_emails && context.email) {
        if (!flag.criteria.user_emails.includes(context.email)) return false;
      }
    }

    return true;
  }

  async getFlag(flagId) {
    const now = Date.now();
    if (this.cache.has(flagId) && now - this.lastFetch < this.CACHE_TTL) {
      return this.cache.get(flagId);
    }

    const results = await db.select().from(featureFlags).where(eq(featureFlags.id, flagId));
    const flag = results[0] || null;

    if (flag) {
      this.cache.set(flagId, flag);
      this.lastFetch = now;
    }

    return flag;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

module.exports = new FeatureFlagService();
