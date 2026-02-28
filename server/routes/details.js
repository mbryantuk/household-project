const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');
const QRCode = require('qrcode');
const { calculateGreenScore } = require('../services/green_score');

/**
 * GET /api/households/:id/details/green-score
 * Item 295: Sustainability Analytics
 */
router.get(
  '/green-score',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await calculateGreenScore(req.hhId);
      response.success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/details/share/wifi
 * Item 281: WiFi QR Code Generation
 */
router.get(
  '/share/wifi',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rawRow = await dbGet(
        req.tenantDb,
        'SELECT broadband_provider, wifi_password FROM house_details WHERE household_id = ?',
        [req.hhId]
      );
      if (!rawRow) throw new NotFoundError('House details not found');

      const row = decryptData('house_details', rawRow);
      const ssid = row.broadband_provider || 'Hearthstone Network';
      const password = row.wifi_password || '';

      if (!password) throw new AppError('WiFi Password not set in House Details', 400);

      // WiFi QR format: WIFI:S:<SSID>;T:WPA;P:<PASSWORD>;;
      const wifiString = `WIFI:S:${ssid};T:WPA;P:${password};;`;
      const qrDataUrl = await QRCode.toDataURL(wifiString);

      response.success(res, { qrCode: qrDataUrl, ssid });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/details
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const row = await dbGet(req.tenantDb, 'SELECT * FROM house_details WHERE household_id = ?', [
        req.hhId,
      ]);
      response.success(res, decryptData('house_details', row) || {});
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/households/:id/details
 */
router.put(
  '/',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  autoEncrypt('house_details'),
  async (req, res, next) => {
    try {
      if (req.isDryRun) return response.success(res, { message: 'Dry run', updates: req.body });

      const cols = await dbAll(req.tenantDb, 'PRAGMA table_info(house_details)', []);
      const validColumns = cols.map((c) => c.name);

      const updates = {};
      Object.keys(req.body).forEach((k) => {
        if (validColumns.includes(k) && k !== 'household_id') updates[k] = req.body[k];
      });

      if (Object.keys(updates).length === 0) {
        return response.success(res, { message: 'No changes needed' });
      }

      const keys = Object.keys(updates);
      const placeholders = keys.map(() => '?').join(', ');
      const setClause = keys.map((k) => `${k} = excluded.${k}`).join(', ');

      await dbRun(
        req.tenantDb,
        `INSERT INTO house_details (household_id, ${keys.join(', ')}) 
         VALUES (?, ${placeholders})
         ON CONFLICT(household_id) DO UPDATE SET ${setClause}`,
        [req.hhId, ...Object.values(updates)]
      );

      await auditLog(
        req.hhId,
        req.user.id,
        'HOUSE_DETAILS_UPDATE',
        'house_details',
        null,
        { updates: keys },
        req
      );
      response.success(res, { message: 'Updated' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/details/smart-home
 * Item 293: Smart Home Simulation
 */
router.get(
  '/smart-home',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const devices = [
        {
          name: 'Kitchen Thermostat',
          type: 'thermostat',
          value: '21°C',
          status: 'heating',
          battery: '85%',
        },
        { name: 'Lounge Lights', type: 'light', value: 'On', status: 'dimmed 70%', battery: 'AC' },
        {
          name: 'Front Door Camera',
          type: 'security',
          value: 'Active',
          status: 'monitoring',
          battery: '92%',
        },
        { name: 'Hallway Lock', type: 'lock', value: 'Locked', status: 'secure', battery: '40%' },
      ];
      response.success(res, devices);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/details/status
 * Item 284: External Service Monitoring (Simulated)
 */
router.get(
  '/status',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const hhId = req.hhId;

      // In a real app, we'd use the household's ZIP code to query utility APIs
      // For now, we simulate a reliable status check
      const services = [
        {
          name: 'Electricity',
          provider: 'UK Power Networks',
          status: 'operational',
          message: 'All systems normal',
        },
        {
          name: 'Water',
          provider: 'Thames Water',
          status: 'operational',
          message: 'No reported leaks in your area',
        },
        {
          name: 'Broadband',
          provider: 'Openreach',
          status: 'operational',
          message: 'Network performance optimal',
        },
      ];

      // Occasional simulated issues for testing
      if (hhId % 10 === 0) {
        services[0].status = 'warning';
        services[0].message = 'Planned maintenance scheduled for tomorrow';
      }

      response.success(res, services);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
