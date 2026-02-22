const fs = require('fs');
const path = require('path');

class JsonReporter {
  constructor(globalConfig, options) {
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const outputPath = path.resolve(__dirname, '../test-report.json');
    try {
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`JSON Report written to ${outputPath}`);
    } catch (err) {
      console.error('Failed to write JSON report:', err);
    }
  }
}

module.exports = JsonReporter;
