const fs = require('fs');
const path = require('path');

const updateVersion = (filePath) => {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;

  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const oldVersion = pkg.version || '1.0.0';
  let [major, minor, patch] = oldVersion.split('.').map(Number);

  patch++;
  const newVersion = `${major}.${minor}.${patch}`;
  pkg.version = newVersion;

  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated ${filePath}: ${oldVersion} -> ${newVersion}`);
};

updateVersion('package.json');
updateVersion('web/package.json');
updateVersion('server/package.json');

