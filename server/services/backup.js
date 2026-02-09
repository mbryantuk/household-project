const fs = require('fs');
const path = require('path');
const admZip = require('adm-zip');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Creates a zip backup of the data directory or a specific household.
 * @param {string|number} householdId - Optional. If provided, only back up that household's DB.
 * @param {object} manifest - Optional. Additional metadata to include in the backup.
 * @returns {Promise<string>} Path to the created backup file.
 */
const createBackup = (householdId = null, manifest = null) => {
    return new Promise((resolve, reject) => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const prefix = householdId ? `household-${householdId}` : 'totem-full';
            const fileName = `${prefix}-backup-${timestamp}.zip`;
            const filePath = path.join(BACKUP_DIR, fileName);
            
            const zip = new admZip();
            
            if (householdId) {
                // Individual Household Backup
                const dbFile = `household_${householdId}.db`;
                const fullPath = path.join(DATA_DIR, dbFile);
                if (fs.existsSync(fullPath)) {
                    zip.addLocalFile(fullPath);
                } else {
                    return reject(new Error(`Database for household ${householdId} not found.`));
                }
            } else {
                // Full System Backup
                const files = fs.readdirSync(DATA_DIR);
                files.forEach(file => {
                    if (file.endsWith('.db')) {
                        const fullPath = path.join(DATA_DIR, file);
                        zip.addLocalFile(fullPath);
                    }
                });
            }

            if (manifest) {
                zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
            }

            zip.writeZip(filePath);
            resolve(fileName);
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Deletes backups older than retentionDays.
 * @param {number} retentionDays 
 */
const cleanOldBackups = (retentionDays = 30) => {
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) return console.error("Backup Clean Error:", err);

        const now = Date.now();
        const cutoff = retentionDays * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            if (!file.endsWith('.zip')) return;
            
            const filePath = path.join(BACKUP_DIR, file);
            fs.stat(filePath, (statErr, stats) => {
                if (statErr) return;
                
                if (now - stats.mtimeMs > cutoff) {
                    fs.unlink(filePath, (unlinkErr) => {
                        if (!unlinkErr) console.log(`Deleted old backup: ${file}`);
                    });
                }
            });
        });
    });
};

/**
 * Restores a backup from a zip file path.
 * WARNING: Overwrites existing data.
 * @param {string} zipFilePath 
 * @param {string|number} householdId - Optional. If provided, only allow restoring that specific household's DB.
 */
const restoreBackup = (zipFilePath, householdId = null) => {
    return new Promise((resolve, reject) => {
        try {
            const zip = new admZip(zipFilePath);
            
            if (householdId) {
                // Safety check: Ensure the zip contains the correct file and nothing else malicious
                const entries = zip.getEntries();
                const expectedFile = `household_${householdId}.db`;
                
                // Validate all entries for Zip Slip even in single-tenant mode
                entries.forEach(entry => {
                    const fullPath = path.join(DATA_DIR, entry.entryName);
                    if (!fullPath.startsWith(DATA_DIR)) {
                        throw new Error(`Malicious zip entry detected: ${entry.entryName}`);
                    }
                });

                const hasValidEntry = entries.some(e => e.entryName === expectedFile);
                if (!hasValidEntry) {
                    return reject(new Error(`Backup does not contain data for household ${householdId}`));
                }

                // Extract only the specific household DB
                zip.extractEntryTo(expectedFile, DATA_DIR, false, true);
            } else {
                // Full Restore - Validate all entries first
                const entries = zip.getEntries();
                entries.forEach(entry => {
                    const fullPath = path.join(DATA_DIR, entry.entryName);
                    if (!fullPath.startsWith(DATA_DIR)) {
                        throw new Error(`Malicious zip entry detected: ${entry.entryName}`);
                    }
                });
                zip.extractAllTo(DATA_DIR, true);
            }
            resolve();
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Lists available backups, optionally filtered by household.
 */
const listBackups = (householdId = null) => {
    return new Promise((resolve, reject) => {
        fs.readdir(BACKUP_DIR, (err, files) => {
            if (err) return reject(err);
            
            const backups = files
                .filter(f => f.endsWith('.zip'))
                .filter(f => !householdId || f.startsWith(`household-${householdId}`))
                .map(f => {
                    const stats = fs.statSync(path.join(BACKUP_DIR, f));
                    return {
                        filename: f,
                        size: stats.size,
                        created: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);
            
            resolve(backups);
        });
    });
};

module.exports = { createBackup, cleanOldBackups, restoreBackup, listBackups, BACKUP_DIR, DATA_DIR };