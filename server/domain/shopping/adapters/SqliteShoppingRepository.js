const IShoppingRepository = require('../ports/IShoppingRepository');
const ShoppingItem = require('../entities/ShoppingItem');
const { decryptData } = require('../../../middleware/encryption');
const { generateUuidV7 } = require('../../../utils/id');

/**
 * SqliteShoppingRepository Adapter
 * Concrete implementation for the SQLite tenant storage.
 */
class SqliteShoppingRepository extends IShoppingRepository {
  constructor(db, householdId) {
    super();
    this.db = db;
    this.householdId = householdId;
  }

  async listByHouseholdId(householdId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM shopping_items WHERE household_id = ?',
        [householdId],
        (err, rows) => {
          if (err) return reject(err);
          const decryptedItems = decryptData('shopping_items', rows || []);
          const items = decryptedItems.map(
            (row) =>
              new ShoppingItem({
                id: row.id,
                householdId: row.household_id,
                name: row.name,
                category: row.category,
                quantity: row.quantity,
                estimatedCost: row.estimated_cost,
                weekStart: row.week_start,
                isChecked: row.is_checked,
                updatedAt: row.updated_at,
                createdAt: row.created_at,
              })
          );
          resolve(items);
        }
      );
    });
  }

  async getById(id, householdId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM shopping_items WHERE id = ? AND household_id = ?',
        [id, householdId],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          const decryptedRows = decryptData('shopping_items', [row]);
          const decRow = decryptedRows[0];
          resolve(
            new ShoppingItem({
              id: decRow.id,
              householdId: decRow.household_id,
              name: decRow.name,
              category: decRow.category,
              quantity: decRow.quantity,
              estimatedCost: decRow.estimated_cost,
              weekStart: decRow.week_start,
              isChecked: decRow.is_checked,
              updatedAt: decRow.updated_at,
              createdAt: decRow.created_at,
            })
          );
        }
      );
    });
  }

  async save(item) {
    if (!item.id) {
      item.id = generateUuidV7();
    }
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO shopping_items (id, household_id, name, category, quantity, estimated_cost, week_start, is_checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          item.id,
          item.householdId,
          item.name,
          item.category,
          item.quantity,
          item.estimatedCost,
          item.weekStart,
          item.isChecked ? 1 : 0,
        ],
        function (err) {
          if (err) return reject(err);
          resolve(item);
        }
      );
    });
  }

  async update(item) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE shopping_items SET name = ?, category = ?, quantity = ?, estimated_cost = ?, is_checked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [
          item.name,
          item.category,
          item.quantity,
          item.estimatedCost,
          item.isChecked ? 1 : 0,
          item.id,
          item.householdId,
        ],
        function (err) {
          if (err) return reject(err);
          resolve(item);
        }
      );
    });
  }

  async delete(id, householdId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM shopping_items WHERE id = ? AND household_id = ?',
        [id, householdId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  async clearChecked(householdId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM shopping_items WHERE household_id = ? AND is_checked = 1',
        [householdId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  }

  async bulk(actions, householdId) {
    // Basic implementation using a transaction for atomicity
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        try {
          let totalChanges = 0;
          for (const action of actions) {
            if (action.type === 'delete') {
              this.db.run('DELETE FROM shopping_items WHERE id = ? AND household_id = ?', [
                action.id,
                householdId,
              ]);
            } else if (action.type === 'update') {
              const updates = Object.keys(action.data)
                .map((key) => `${key} = ?`)
                .join(', ');
              const values = Object.values(action.data);
              values.push(action.id, householdId);
              this.db.run(
                `UPDATE shopping_items SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?`,
                values
              );
            }
          }
          this.db.run('COMMIT', (err) => {
            if (err) return reject(err);
            resolve(true);
          });
        } catch (err) {
          this.db.run('ROLLBACK');
          reject(err);
        }
      });
    });
  }
}

module.exports = SqliteShoppingRepository;
