const fs = require('fs');
const path = require('path');

const BACKEND_REPORT = path.join(__dirname, '../../server/test-report.json');

const parseJestJson = (filePath, title) => {
    if (fs.existsSync(filePath)) {
        try {
            const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (results.testResults && Array.isArray(results.testResults)) {
                results.testResults.forEach(suite => {
                    const filePath = suite.name || suite.testFilePath || "Unknown";
                    const fileName = path.basename(filePath);
                    const tests = suite.testResults || suite.assertionResults || [];
                    console.log(`${fileName}: ${tests.length} tests`);
                });
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    } else {
        console.log("Report file not found.");
    }
};

parseJestJson(BACKEND_REPORT, "Backend Tests");
