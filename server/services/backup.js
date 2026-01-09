const fs = require('fs');
const path = require('path');
const admZip = require('adm-zip');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Creates a zip backup of the data directory.
 * @returns {Promise<string>} Path to the created backup file.
 */
const createBackup = () => {
    return new Promise((resolve, reject) => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `totem-backup-${timestamp}.zip`;
            const filePath = path.join(BACKUP_DIR, fileName);
            
            const zip = new admZip();
            
            // Add all .db files from DATA_DIR
            const files = fs.readdirSync(DATA_DIR);
            files.forEach(file => {
                if (file.endsWith('.db')) {
                    const fullPath = path.join(DATA_DIR, file);
                    zip.addLocalFile(fullPath);
                }
            });

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
 */
const restoreBackup = (zipFilePath) => {
    return new Promise((resolve, reject) => {
        try {
            const zip = new admZip(zipFilePath);
            // Overwrite existing files in DATA_DIR
            zip.extractAllTo(DATA_DIR, true);
            resolve();
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Lists available backups.
 */
const listBackups = () => {
    return new Promise((resolve, reject) => {
        fs.readdir(BACKUP_DIR, (err, files) => {
            if (err) return reject(err);
            
            const backups = files
                .filter(f => f.endsWith('.zip'))
                .map(f => {
                    const stats = fs.statSync(path.join(BACKUP_DIR, f));
                    return {
                        filename: f,
                        size: stats.size,
                        created: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created); // Newest first
            
            resolve(backups);
        });
    });
};

module.exports = { createBackup, cleanOldBackups, restoreBackup, listBackups, BACKUP_DIR };
