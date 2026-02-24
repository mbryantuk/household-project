const ShoppingItem = require('../entities/ShoppingItem');

/**
 * ShoppingService (Application Service)
 * Orchestrates domain logic and repository interactions.
 */
class ShoppingService {
  constructor(repository) {
    this.repository = repository;
  }

  async listItems(householdId) {
    return await this.repository.listByHouseholdId(householdId);
  }

  async addItem(householdId, data) {
    const item = new ShoppingItem({
      householdId,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      estimatedCost: data.estimated_cost,
      weekStart: data.weekStart,
      isChecked: data.isChecked || false,
    });
    return await this.repository.save(item);
  }

  async updateItem(id, householdId, data) {
    const item = await this.repository.getById(id, householdId);
    if (!item) return null;

    item.update({
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      estimatedCost: data.estimated_cost,
    });

    if (data.is_checked !== undefined) {
      item.isChecked = !!data.is_checked;
    }

    return await this.repository.update(item);
  }

  async deleteItem(id, householdId) {
    return await this.repository.delete(id, householdId);
  }

  async clearChecked(householdId) {
    return await this.repository.clearChecked(householdId);
  }

  async bulkAction(householdId, actions) {
    return await this.repository.bulk(actions, householdId);
  }
}

module.exports = ShoppingService;
