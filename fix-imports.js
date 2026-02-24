const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace const { app, server } = require('../../server');
      if (content.includes("const { app, server } = require('../../server');")) {
        content = content.replace(
          "const { app, server } = require('../../server');",
          "const app = require('../../App');"
        );
        changed = true;
      }

      if (content.includes("const { app } = require('../../server');")) {
        content = content.replace(
          "const { app } = require('../../server');",
          "const app = require('../../App');"
        );
        changed = true;
      }

      if (content.includes("const { app, server } = require('../server');")) {
        content = content.replace(
          "const { app, server } = require('../server');",
          "const app = require('../App');"
        );
        changed = true;
      }

      if (content.includes("const { app } = require('../server');")) {
        content = content.replace(
          "const { app } = require('../server');",
          "const app = require('../App');"
        );
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walkDir(path.join(__dirname, 'server/tests'));
