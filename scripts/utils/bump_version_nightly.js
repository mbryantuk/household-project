const fs = require('fs');
const path = require('path');

const getVersion = (filePath) => {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return '1.0.0';
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return pkg.version || '1.0.0';
};

const setVersion = (filePath, version) => {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated ${filePath} to ${version}`);
};

const oldVersion = getVersion('package.json');
// Remove any existing suffixes (e.g., 3.0.183-20260201 -> 3.0.183)
let baseVersion = oldVersion.split('-')[0];

// Safety: if baseVersion somehow became 3.2.NaN, fix it
if (baseVersion.includes('NaN')) {
  baseVersion = baseVersion.replace('NaN', '1');
}

const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '');
const newVersion = `${baseVersion}-${dateSuffix}`;

setVersion('package.json', newVersion);
setVersion('web/package.json', newVersion);
setVersion('server/package.json', newVersion);
console.log(newVersion);
