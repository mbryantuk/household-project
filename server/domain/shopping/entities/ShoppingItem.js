/**
 * ShoppingItem Entity (Domain Core)
 * Pure domain logic, no dependencies.
 */
class ShoppingItem {
  constructor({
    id,
    householdId,
    name,
    category,
    quantity,
    estimatedCost,
    weekStart,
    isChecked,
    updatedAt,
    createdAt,
  }) {
    this.id = id;
    this.householdId = householdId;
    this.name = name;
    this.category = category;
    this.quantity = quantity;
    this.estimatedCost = estimatedCost || 0;
    this.weekStart = weekStart;
    this.isChecked = !!isChecked;
    this.updatedAt = updatedAt || new Date();
    this.createdAt = createdAt || new Date();
  }

  toggleCheck() {
    this.isChecked = !this.isChecked;
    this.updatedAt = new Date();
  }

  update({ name, category, quantity, estimatedCost }) {
    if (name !== undefined) this.name = name;
    if (category !== undefined) this.category = category;
    if (quantity !== undefined) this.quantity = quantity;
    if (estimatedCost !== undefined) this.estimatedCost = estimatedCost;
    this.updatedAt = new Date();
  }
}

module.exports = ShoppingItem;
