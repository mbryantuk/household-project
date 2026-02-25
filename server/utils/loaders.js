const DataLoader = require('dataloader');
const { db } = require('../db/index');
const { users, userHouseholds } = require('../db/schema');
const { inArray, eq } = require('drizzle-orm');

/**
 * Item 161: DataLoader Pattern
 * Standardizes batch fetching to solve N+1 query problems.
 */
class LoaderFactory {
  constructor() {
    this.loaders = new Map();
  }

  /**
   * Get or create a loader for users by ID
   */
  getUsersLoader() {
    if (!this.loaders.has('users')) {
      this.loaders.set(
        'users',
        new DataLoader(async (ids) => {
          const results = await db.select().from(users).where(inArray(users.id, ids));
          const map = new Map(results.map((u) => [u.id, u]));
          return ids.map((id) => map.get(id) || null);
        })
      );
    }
    return this.loaders.get('users');
  }

  /**
   * Get or create a loader for household members
   */
  getMembersLoader() {
    if (!this.loaders.has('members')) {
      this.loaders.set(
        'members',
        new DataLoader(async (hhIds) => {
          const results = await db
            .select({
              householdId: userHouseholds.householdId,
              user: users,
            })
            .from(userHouseholds)
            .innerJoin(users, eq(users.id, userHouseholds.userId))
            .where(inArray(userHouseholds.householdId, hhIds));

          // Group users by householdId
          const map = hhIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
          results.forEach((row) => {
            map[row.householdId].push(row.user);
          });

          return hhIds.map((id) => map[id]);
        })
      );
    }
    return this.loaders.get('members');
  }
}

module.exports = LoaderFactory;
