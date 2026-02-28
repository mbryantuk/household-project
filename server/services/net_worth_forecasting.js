const { dbAll } = require('../db');
const logger = require('../utils/logger');
const { addMonths, format } = require('date-fns');

/**
 * Item 264: Net Worth Projection
 * Calculates current net worth and projects it 12 months into the future.
 */
async function getNetWorthProjection(tenantDb, householdId, profileId) {
  try {
    let params = [householdId];
    let profileSql = '';
    if (profileId) {
      profileSql = ` AND financial_profile_id = ?`;
      params.push(profileId);
    }

    // 1. Fetch current balances
    const [accounts, savings, investments, pensions, cards, vehicles, assets, rawRecurring] =
      await Promise.all([
        dbAll(
          tenantDb,
          `SELECT current_balance FROM finance_current_accounts WHERE household_id = ? AND deleted_at IS NULL ${profileSql}`,
          params
        ),
        dbAll(
          tenantDb,
          `SELECT current_balance FROM finance_savings WHERE household_id = ? AND deleted_at IS NULL ${profileSql}`,
          params
        ),
        dbAll(
          tenantDb,
          `SELECT current_value FROM finance_investments WHERE household_id = ? AND deleted_at IS NULL ${profileSql}`,
          params
        ),
        dbAll(
          tenantDb,
          `SELECT current_value FROM finance_pensions WHERE household_id = ? AND deleted_at IS NULL ${profileSql}`,
          params
        ),
        dbAll(
          tenantDb,
          `SELECT current_balance FROM finance_credit_cards WHERE household_id = ? AND deleted_at IS NULL ${profileSql}`,
          params
        ),
        dbAll(
          tenantDb,
          `SELECT current_value FROM vehicles WHERE household_id = ? AND deleted_at IS NULL`,
          [householdId]
        ), // Vehicles/Assets aren't profile-specific usually
        dbAll(
          tenantDb,
          `SELECT purchase_value FROM assets WHERE household_id = ? AND deleted_at IS NULL`,
          [householdId]
        ),
        dbAll(
          tenantDb,
          `SELECT amount, metadata, category_id FROM recurring_costs WHERE household_id = ? AND deleted_at IS NULL ${profileSql}`,
          params
        ),
      ]);

    // Calculate Current Assets
    const liquidAssets =
      accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0) +
      savings.reduce((sum, s) => sum + (s.current_balance || 0), 0);
    const investedAssets =
      investments.reduce((sum, i) => sum + (i.current_value || 0), 0) +
      pensions.reduce((sum, p) => sum + (p.current_value || 0), 0);
    const physicalAssets =
      vehicles.reduce((sum, v) => sum + (v.current_value || 0), 0) +
      assets.reduce((sum, a) => sum + (a.purchase_value || 0), 0);

    // Calculate Current Liabilities
    const cardDebt = cards.reduce((sum, c) => sum + (c.current_balance || 0), 0);

    let otherDebt = 0;
    rawRecurring.forEach((r) => {
      if (['loan', 'mortgage', 'vehicle_finance'].includes(r.category_id)) {
        const meta = r.metadata ? JSON.parse(r.metadata) : {};
        otherDebt += parseFloat(meta.remaining_balance) || 0;
      }
    });

    const currentNetWorth = liquidAssets + investedAssets + physicalAssets - cardDebt - otherDebt;

    // 2. Estimate Monthly Inflow/Outflow
    const income = await dbAll(
      tenantDb,
      `SELECT amount FROM finance_income WHERE household_id = ? AND deleted_at IS NULL AND is_active = 1 ${profileSql}`,
      params
    );
    const monthlyIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);

    // Monthly Recurring Costs (Expenses)
    const monthlyExpenses = rawRecurring
      .filter((r) => !['loan', 'mortgage', 'vehicle_finance'].includes(r.category_id))
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // Estimated monthly growth (Income - Expenses - assumed 10% misc spend)
    const estimatedMonthlyGrowth = monthlyIncome - monthlyExpenses - monthlyIncome * 0.1;

    // 3. Project 12 Months
    const projection = [];
    let projectedNetWorth = currentNetWorth;

    for (let i = 0; i <= 12; i++) {
      projection.push({
        month: format(addMonths(new Date(), i), 'MMM yy'),
        netWorth: Math.round(projectedNetWorth),
      });
      projectedNetWorth += estimatedMonthlyGrowth;
    }

    return {
      currentNetWorth,
      estimatedMonthlyGrowth,
      projection,
    };
  } catch (err) {
    logger.error(`[NET-WORTH-FORECAST] Failed for HH:${householdId}:`, err);
    return null;
  }
}

module.exports = { getNetWorthProjection };
