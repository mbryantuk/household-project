const fs = require('fs');
const path = require('path');

describe('Frontend Build Smoke Test', () => {
    test('index.html should exist after build', () => {
        const indexPath = path.join(__dirname, '../../../web/dist/index.html');
        expect(fs.existsSync(indexPath)).toBe(true);
    });

    test('index.html should contain root div', () => {
        const indexPath = path.join(__dirname, '../../../web/dist/index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        expect(html).toContain('<div id="root"></div>');
    });

    test('JS bundle should be referenced', () => {
        const indexPath = path.join(__dirname, '../../../web/dist/index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        expect(html).toContain('script type="module"');
    });
});
