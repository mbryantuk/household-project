const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { globalDb, getHouseholdDb } = require('../db');
const { SECRET_KEY } = require('../config');
const {
  authenticateToken,
  requireHouseholdRole,
  requireSystemRole,
} = require('../middleware/auth');
const {
  listBackups,
  createBackup,
  restoreBackup,
  BACKUP_DIR,
  DATA_DIR,
} = require('../services/backup');

// Upload middleware for full system restores
const upload = multer({ dest: path.join(__dirname, '../data/temp_uploads/') });

// Health Check Paths
const HEALTH_LOG = path.join(__dirname, '../data/health_check.log');
const HEALTH_STATUS = path.join(__dirname, '../data/health_status.json');

// HELPER: Promisify DB get
const dbGet = (db, sql, params) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

// HELPER: Promisify DB all
const dbAll = (db, sql, params) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

// HELPER: Promisify DB run
const dbRun = (db, sql, params) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
    });
  });

// ==========================================
// 🛡️ HOUSEHOLD BACKUP (System Admin Only)
// ==========================================

router.get('/backups', authenticateToken, requireSystemRole('admin'), (req, res) => {
  listBackups()
    .then((backups) => res.json(backups))
    .catch((err) => res.status(500).json({ error: err.message }));
});

router.post('/backups/trigger', authenticateToken, requireSystemRole('admin'), (req, res) => {
  createBackup()
    .then((filename) => res.json({ message: 'Backup created', filename }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

router.get(
  '/backups/download/:filename',
  authenticateToken,
  requireSystemRole('admin'),
  (req, res) => {
    const filename = req.params.filename;
    // Prevent Path Traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(403).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  }
);

router.post(
  '/backups/upload',
  authenticateToken,
  requireSystemRole('admin'),
  upload.single('backup'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      await restoreBackup(req.file.path);
      fs.unlinkSync(req.file.path);
      res.json({ message: 'Restore complete.' });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: err.message });
    }
  }
);

// ==========================================
// 🌍 HOUSEHOLD MANAGEMENT (System Admin Only)
// ==========================================

/**
 * GET /admin/all-households
 * Returns all households in the system.
 */
router.get('/all-households', authenticateToken, requireSystemRole('admin'), (req, res) => {
  globalDb.all('SELECT * FROM households ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * GET /admin/households/:id/export
 * Exports a household's data including global metadata and users.
 */
router.get(
  '/households/:id/export',
  authenticateToken,
  requireSystemRole('admin'),
  async (req, res) => {
    const householdId = req.params.id;
    try {
      const household = await dbGet(globalDb, 'SELECT * FROM households WHERE id = ?', [
        householdId,
      ]);
      if (!household) return res.status(404).json({ error: 'Household not found' });

      const users = await dbAll(
        globalDb,
        `
            SELECT u.*, uh.role 
            FROM users u
            JOIN user_households uh ON u.id = uh.user_id
            WHERE uh.household_id = ?
        `,
        [householdId]
      );

      const manifest = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        household,
        users,
      };

      const filename = await createBackup(householdId, manifest);
      res.json({ message: 'Export ready', filename });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/households', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
  // Only return the household they are admin of, unless system admin
  const hhId = req.query.id || req.user.householdId;
  globalDb.all('SELECT * FROM households WHERE id = ?', [hhId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create household is restricted to the /auth/register route in this model
// but we keep the logic here if needed for existing flows, restricting to admin
router.post('/households', authenticateToken, async (req, res) => {
  return res
    .status(403)
    .json({ error: 'Direct household creation via admin route disabled. Use registration.' });
});

router.put('/households/:id', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
  const {
    name,
    address_street,
    address_city,
    address_zip,
    date_format,
    currency,
    decimals,
    avatar,
    auto_backup,
    backup_retention,
  } = req.body;
  let fields = [];
  let values = [];
  if (name) {
    fields.push('name = ?');
    values.push(name);
  }
  if (address_street !== undefined) {
    fields.push('address_street = ?');
    values.push(address_street);
  }
  if (address_city !== undefined) {
    fields.push('address_city = ?');
    values.push(address_city);
  }
  if (address_zip !== undefined) {
    fields.push('address_zip = ?');
    values.push(address_zip);
  }
  if (date_format) {
    fields.push('date_format = ?');
    values.push(date_format);
  }
  if (currency) {
    fields.push('currency = ?');
    values.push(currency);
  }
  if (decimals !== undefined) {
    fields.push('decimals = ?');
    values.push(decimals);
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(avatar);
  }
  if (auto_backup !== undefined) {
    fields.push('auto_backup = ?');
    values.push(auto_backup);
  }
  if (backup_retention !== undefined) {
    fields.push('backup_retention = ?');
    values.push(backup_retention);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id);
  globalDb.run(`UPDATE households SET ${fields.join(', ')} WHERE id = ?`, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Household updated' });
  });
});

// ==========================================
// 👥 USER MANAGEMENT (Admin)
// ==========================================

router.get('/users', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
  const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role 
        FROM users u
        JOIN user_households uh ON u.id = uh.user_id
        WHERE uh.household_id = ?
    `;
  globalDb.all(sql, [req.user.householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * GET /admin/users/:userId
 */
router.get('/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  try {
    const user = await dbGet(
      globalDb,
      `
            SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role 
            FROM users u
            JOIN user_households uh ON u.id = uh.user_id
            WHERE u.id = ? AND uh.household_id = ?
        `,
      [req.params.userId, req.user.householdId]
    );

    if (!user) return res.status(404).json({ error: 'User not found in this household' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-user', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const { username, password, role, email, first_name, last_name, avatar, householdId } = req.body;

  // SECURITY: If not a system admin, they can ONLY add users to their own current household
  let targetHhId = householdId || req.user.householdId;
  if (req.user.systemRole !== 'admin' && parseInt(targetHhId) !== parseInt(req.user.householdId)) {
    return res
      .status(403)
      .json({ error: 'Access denied: You can only add users to your own household.' });
  }

  const finalEmail = email || `${username}@example.com`;

  try {
    const hash = bcrypt.hashSync(password, 8);
    let userId;
    const existing = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [finalEmail]);
    if (existing) {
      userId = existing.id;
    } else {
      const res = await dbRun(
        globalDb,
        `INSERT INTO users (email, password_hash, first_name, last_name, avatar, system_role, is_active) VALUES (?, ?, ?, ?, ?, 'user', 1)`,
        [finalEmail, hash, first_name || username, last_name, avatar]
      );
      userId = res.id;
    }

    await dbRun(
      globalDb,
      `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`,
      [userId, targetHhId, role || 'member']
    );

    res.json({ message: 'User created', id: userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const { username, password, email, first_name, last_name, avatar } = req.body;

  let fields = [];
  let values = [];
  if (username) {
    fields.push('first_name = ?');
    values.push(username);
  }
  if (password) {
    fields.push('password_hash = ?');
    values.push(bcrypt.hashSync(password, 8));
  }
  if (email !== undefined) {
    fields.push('email = ?');
    values.push(email);
  }
  if (first_name !== undefined) {
    fields.push('first_name = ?');
    values.push(first_name);
  }
  if (last_name !== undefined) {
    fields.push('last_name = ?');
    values.push(last_name);
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(avatar);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.userId);

  try {
    await dbRun(globalDb, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete(
  '/users/:userId',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res) => {
    // Just remove from this household
    globalDb.run(
      'DELETE FROM user_households WHERE user_id = ? AND household_id = ?',
      [req.params.userId, req.user.householdId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User removed from household' });
      }
    );
  }
);

// ==========================================
// 🧪 TEST MONITORING (Admin Only)
// ==========================================

router.get('/test-results', authenticateToken, requireSystemRole('admin'), (req, res) => {
  globalDb.all('SELECT * FROM test_results ORDER BY created_at DESC LIMIT 100', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==========================================
// 🏥 HEALTH CHECK (Admin Only)
// ==========================================

const updateHealthStatus = (status) => {
  fs.writeFileSync(
    HEALTH_STATUS,
    JSON.stringify({ ...status, timestamp: new Date().toISOString() })
  );
};

const getHealthStatus = () => {
  if (!fs.existsSync(HEALTH_STATUS)) return { state: 'idle' };
  try {
    return JSON.parse(fs.readFileSync(HEALTH_STATUS, 'utf8'));
  } catch {
    return { state: 'idle' };
  }
};

router.post('/health-check/trigger', authenticateToken, requireSystemRole('admin'), (req, res) => {
  const status = getHealthStatus();
  if (status.state === 'running') {
    return res.status(409).json({ error: 'A health check is already in progress.' });
  }

  const {
    skipDocker = false,
    skipBackend = false,
    skipFrontend = false,
    skipPurge = false,
  } = req.body;

  // Reset log and status
  fs.writeFileSync(HEALTH_LOG, '');
  updateHealthStatus({
    state: 'running',
    progress: 0,
    message: 'Starting comprehensive suite...',
    options: { skipDocker, skipBackend, skipFrontend, skipPurge },
  });

  const scriptPath = path.join(__dirname, '../../scripts/ops/nightly_suite.sh');
  const args = [];
  if (skipDocker) args.push('--skip-docker');
  if (skipBackend) args.push('--skip-backend');
  if (skipFrontend) args.push('--skip-frontend');
  if (skipPurge) args.push('--skip-purge');

  const child = spawn('bash', [scriptPath, ...args], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logStream = fs.createWriteStream(HEALTH_LOG, { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  child.stdout.on('data', (data) => {
    const line = data.toString();
    if (line.includes('[1/6]'))
      updateHealthStatus({ state: 'running', progress: 15, message: 'Refreshing containers...' });
    if (line.includes('[2/6]'))
      updateHealthStatus({ state: 'running', progress: 30, message: 'Running backend tests...' });
    if (line.includes('[3/6]'))
      updateHealthStatus({
        state: 'running',
        progress: 60,
        message: 'Running frontend smoke tests...',
      });
    if (line.includes('[4/6]'))
      updateHealthStatus({ state: 'running', progress: 80, message: 'Cleaning up test data...' });
    if (line.includes('[5/6]'))
      updateHealthStatus({ state: 'running', progress: 90, message: 'Emailing report...' });
    if (line.includes('[6/6]'))
      updateHealthStatus({
        state: 'running',
        progress: 95,
        message: 'Finalizing system hygiene...',
      });
  });

  child.on('close', (code) => {
    if (code === 0) {
      updateHealthStatus({
        state: 'completed',
        progress: 100,
        message: 'Health check finished successfully.',
      });
    } else {
      updateHealthStatus({
        state: 'failed',
        progress: 100,
        message: `Health check failed with code ${code}.`,
      });
    }
  });

  child.unref();
  res.json({ message: 'Health check triggered.' });
});

router.get('/health-check/status', authenticateToken, requireSystemRole('admin'), (req, res) => {
  const status = getHealthStatus();
  let logs = '';
  if (fs.existsSync(HEALTH_LOG)) {
    logs = fs.readFileSync(HEALTH_LOG, 'utf8');
  }
  res.json({ ...status, logs });
});

// ==========================================
// 🚀 VERSION HISTORY
// ==========================================

router.get('/version-history', authenticateToken, requireSystemRole('admin'), (req, res) => {
  globalDb.all(
    'SELECT * FROM version_history ORDER BY created_at DESC LIMIT 50',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
