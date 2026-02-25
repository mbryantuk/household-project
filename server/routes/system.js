const express = require('express');
const router = express.Router();
const response = require('../utils/response');
const { getBankHolidays } = require('../services/bankHolidays');

/**
 * GET /holidays
 * Item 18: Bank Holiday Support
 */
router.get('/holidays', async (req, res, next) => {
  try {
    const holidays = await getBankHolidays();
    response.success(res, holidays);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /vitals
 * Item 159: Telemetry
 */
router.post('/vitals', (req, res) => {
  // Just acknowledge receipt for now. 
  // We can add logic later to store these in a metrics table.
  response.success(res, { message: 'Vitals recorded' });
});

module.exports = router;
