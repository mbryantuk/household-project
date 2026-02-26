const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { dbAll, getHouseholdDb } = require('../db');
const logger = require('../utils/logger');

/**
 * REPORT GENERATOR SERVICE
 * Item 222: Monthly Financial Report
 */

async function generateMonthlyReport(householdId, month, year) {
  logger.info(`[REPORT-GEN] Generating report for HH:${householdId} - ${month}/${year}`);
  const db = getHouseholdDb(householdId);
  const doc = new PDFDocument({ margin: 50 });
  const filename = `report-${householdId}-${year}-${month}.pdf`;
  const filePath = path.join(__dirname, '../data/uploads', filename);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  try {
    // 1. Fetch Data
    const [hh] = await dbAll(db, 'SELECT * FROM house_details WHERE household_id = ?', [
      householdId,
    ]);
    const accounts = await dbAll(
      db,
      'SELECT * FROM finance_current_accounts WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );
    const incomes = await dbAll(
      db,
      'SELECT * FROM finance_income WHERE household_id = ? AND deleted_at IS NULL AND is_active = 1',
      [householdId]
    );
    const costs = await dbAll(
      db,
      'SELECT * FROM recurring_costs WHERE household_id = ? AND deleted_at IS NULL AND is_active = 1',
      [householdId]
    );

    // 2. Header
    doc.fontSize(25).text('Monthly Household Report', { align: 'center' });
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`Household: ${hh?.property_type || 'My Home'}`, { underline: true });
    doc.moveDown();

    // 3. Financial Summary
    doc.fontSize(16).text('Financial Summary');
    doc.rect(50, doc.y, 500, 2).fill('#374151');
    doc.moveDown();

    const totalBalance = accounts.reduce((sum, a) => sum + (parseFloat(a.current_balance) || 0), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const totalCosts = costs.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    doc.fontSize(12);
    doc.text(`Total Liquid Assets: £${totalBalance.toLocaleString()}`);
    doc.text(`Estimated Monthly Inflow: £${totalIncome.toLocaleString()}`);
    doc.text(`Estimated Recurring Outflow: £${totalCosts.toLocaleString()}`);
    doc.moveDown();

    // 4. Accounts Breakdown
    doc.fontSize(14).text('Accounts Breakdown');
    doc.moveDown(0.5);
    accounts.forEach((acc) => {
      doc
        .fontSize(10)
        .text(`${acc.account_name}: £${parseFloat(acc.current_balance).toLocaleString()}`);
    });
    doc.moveDown();

    // 5. Footer
    doc
      .fontSize(8)
      .text('Hearthstone Pro - Private & Confidential', { align: 'center', bottom: 50 });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filename));
      stream.on('error', reject);
    });
  } catch (err) {
    logger.error(`[REPORT-GEN] Failed to generate report for HH:${householdId}:`, err);
    throw err;
  }
}

module.exports = { generateMonthlyReport };
