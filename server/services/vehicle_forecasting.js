const { dbAll, getHouseholdDb } = require('../db');
const logger = require('../utils/logger');
const { addMonths, format, differenceInDays, addDays } = require('date-fns');

/**
 * VEHICLE FORECASTING SERVICE
 * Item 261: Enhanced Linear Regression for Service Prediction
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
      // 1. Get last service and mileage logs
      const [services, logs] = await Promise.all([
        dbAll(
          db,
          'SELECT * FROM vehicle_services WHERE vehicle_id = ? ORDER BY date DESC LIMIT 1',
          [v.id]
        ),
        dbAll(
          db,
          'SELECT mileage, date FROM mileage_logs WHERE vehicle_id = ? AND deleted_at IS NULL ORDER BY date ASC',
          [v.id]
        ),
      ]);

      const lastService = services[0];
      const currentMileage = parseInt(v.current_mileage) || 0;
      const interval = parseInt(v.service_interval_miles) || 10000;
      const lastServiceMileage = lastService ? parseInt(lastService.mileage) || 0 : 0;

      // 2. Linear Regression / Advanced Average
      let dailyMileage = (parseInt(v.avg_monthly_mileage) || 1000) / 30;
      let confidence = 'low';

      if (logs.length >= 2) {
        // Calculate rate between first and last log
        const first = logs[0];
        const last = logs[logs.length - 1];
        const daysDiff = differenceInDays(new Date(last.date), new Date(first.date));
        const milesDiff = last.mileage - first.mileage;

        if (daysDiff > 0 && milesDiff > 0) {
          dailyMileage = milesDiff / daysDiff;
          confidence = logs.length > 5 ? 'high' : 'medium';
        }
      }

      // 3. Calculate remaining miles and predict date
      const milesSinceService = currentMileage - lastServiceMileage;
      const milesToNextService = interval - milesSinceService;

      let predictedDate = new Date();
      if (dailyMileage > 0) {
        const daysToService = Math.max(0, milesToNextService / dailyMileage);
        predictedDate = addDays(new Date(), daysToService);
      } else {
        predictedDate = addMonths(new Date(), 12); // Fallback
      }

      forecasts.push({
        vehicleId: v.id,
        make: v.make,
        model: v.model,
        currentMileage,
        milesToNextService,
        dailyRate: dailyMileage.toFixed(2),
        confidence,
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
