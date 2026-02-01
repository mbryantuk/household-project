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
// Remove any existing date suffix (e.g., 3.0.183-20260201 -> 3.0.183)
const baseVersion = oldVersion.split('-')[0];

const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '');
const newVersion = `${baseVersion}-${dateSuffix}`;

setVersion('package.json', newVersion);
setVersion('web/package.json', newVersion);
setVersion('server/package.json', newVersion);
console.log(newVersion);
