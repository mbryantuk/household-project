/**
 * Item 252: Debt Payoff Strategy Optimizer
 */
const { dbAll } = require('../db');

async function calculateDebtStrategy(tenantDb, householdId, profileId) {
  let params = [householdId];
  let profileSql = '';
  if (profileId) {
    profileSql = ` AND financial_profile_id = ?`;
    params.push(profileId);
  }

  // Fetch Credit Cards
  const cardsSql = `SELECT id, card_name as name, current_balance as balance, apr as rate, 'credit_card' as type FROM finance_credit_cards WHERE household_id = ? AND deleted_at IS NULL AND current_balance > 0 ${profileSql}`;
  const cards = await dbAll(tenantDb, cardsSql, params);

  // Fetch Recurring Costs (Loans, Mortgages, Vehicle Finance)
  const debtsSql = `SELECT id, name, metadata, category_id as type FROM recurring_costs WHERE household_id = ? AND deleted_at IS NULL AND category_id IN ('loan', 'mortgage', 'vehicle_finance') ${profileSql}`;
  const rawDebts = await dbAll(tenantDb, debtsSql, params);

  const parsedDebts = rawDebts
    .map((d) => {
      const meta = d.metadata ? JSON.parse(d.metadata) : {};
      return {
        id: d.id,
        name: d.name,
        balance: parseFloat(meta.remaining_balance) || 0,
        rate: parseFloat(meta.interest_rate) || 0,
        type: d.type,
      };
    })
    .filter((d) => d.balance > 0);

  const allDebts = [...cards, ...parsedDebts];

  if (allDebts.length === 0) {
    return {
      recommendedStrategy: 'None',
      debts: [],
      message: 'No active debts found. Great job!',
      avalancheOrder: [],
      snowballOrder: [],
    };
  }

  // Avalanche: Sort by highest interest rate first
  const avalanche = [...allDebts].sort((a, b) => b.rate - a.rate);

  // Snowball: Sort by lowest balance first
  const snowball = [...allDebts].sort((a, b) => a.balance - b.balance);

  // Recommendation Logic: If highest interest rate is > 15%, suggest Avalanche to save money.
  // Otherwise, Snowball for psychological wins.
  const highestRate = avalanche[0]?.rate || 0;
  let recommended = 'Snowball';
  let message =
    'We recommend the Snowball method (paying off smallest balances first) to gain momentum and psychological wins.';

  if (highestRate > 15) {
    recommended = 'Avalanche';
    message = `We recommend the Avalanche method. Your highest interest rate is ${highestRate}%, which is costing you significantly in interest. Pay this off first!`;
  }

  return {
    recommendedStrategy: recommended,
    message,
    debts: allDebts,
    avalancheOrder: avalanche,
    snowballOrder: snowball,
  };
}

module.exports = { calculateDebtStrategy };
