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
const baseVersion = oldVersion.split('-')[0];
let [major, minor, patch] = baseVersion.split('.').map((v) => parseInt(v, 10));

if (isNaN(major)) major = 0;
if (isNaN(minor)) minor = 0;
if (isNaN(patch)) patch = 0;

patch++;
const newVersion = `${major}.${minor}.${patch}`;

setVersion('package.json', newVersion);
setVersion('web/package.json', newVersion);
setVersion('server/package.json', newVersion);
