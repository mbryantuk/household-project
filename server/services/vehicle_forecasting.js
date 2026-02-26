const { dbAll, getHouseholdDb } = require('../db');
const logger = require('../utils/logger');
const { addMonths, format } = require('date-fns');

/**
 * VEHICLE FORECASTING SERVICE
 * Item 224: Mileage-based maintenance prediction
 */

async function getVehicleMaintenanceForecast(householdId) {
  logger.info(`[VEHICLE-FORECAST] Predicting maintenance for HH:${householdId}`);
  const db = getHouseholdDb(householdId);

  try {
    const vehicles = await dbAll(
      db,
      'SELECT * FROM vehicles WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );
    const forecasts = [];

    for (const v of vehicles) {
      // 1. Get last service
      const services = await dbAll(
        db,
        'SELECT * FROM vehicle_services WHERE vehicle_id = ? ORDER BY date DESC LIMIT 1',
        [v.id]
      );
      const lastService = services[0];

      const currentMileage = parseInt(v.current_mileage) || 0;
      const avgMonthly = parseInt(v.avg_monthly_mileage) || 1000;
      const interval = parseInt(v.service_interval_miles) || 10000;
      const lastServiceMileage = lastService ? parseInt(lastService.mileage) || 0 : 0;

      // 2. Calculate remaining miles
      const milesSinceService = currentMileage - lastServiceMileage;
      const milesToNextService = interval - milesSinceService;

      // 3. Predict date
      let predictedMonths = 0;
      if (avgMonthly > 0) {
        predictedMonths = Math.max(0, milesToNextService / avgMonthly);
      }

      const predictedDate = addMonths(new Date(), predictedMonths);

      forecasts.push({
        vehicleId: v.id,
        make: v.make,
        model: v.model,
        currentMileage,
        milesToNextService,
        predictedServiceDate: format(predictedDate, 'yyyy-MM-dd'),
        isOverdue: milesToNextService <= 0,
      });
    }

    return forecasts;
  } catch (err) {
    logger.error(`[VEHICLE-FORECAST] Error forecasting for HH:${householdId}:`, err);
    throw err;
  }
}

module.exports = { getVehicleMaintenanceForecast };
