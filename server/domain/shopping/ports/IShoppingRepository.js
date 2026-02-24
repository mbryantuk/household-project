/**
 * IShoppingRepository Port (Interface Definition)
 * Defines the contract that storage adapters must implement.
 */
class IShoppingRepository {
  /**
   * List all shopping items for a household.
   * @param {number} householdId
   */
  async listByHouseholdId(householdId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get a specific item by ID.
   * @param {number} id
   * @param {number} householdId
   */
  async getById(id, householdId) {
    throw new Error('Method not implemented');
  }

  /**
   * Save a new shopping item.
   * @param {ShoppingItem} item
   */
  async save(item) {
    throw new Error('Method not implemented');
  }

  /**
   * Update an existing item.
   * @param {ShoppingItem} item
   */
  async update(item) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete an item by ID.
   * @param {number} id
   * @param {number} householdId
   */
  async delete(id, householdId) {
    throw new Error('Method not implemented');
  }

  /**
   * Clear all checked items for a household.
   * @param {number} householdId
   */
  async clearChecked(householdId) {
    throw new Error('Method not implemented');
  }

  /**
   * Bulk action for many items.
   * @param {Array} actions - Array of { type: 'update'|'delete', id, data }
   * @param {number} householdId
   */
  async bulk(actions, householdId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IShoppingRepository;
