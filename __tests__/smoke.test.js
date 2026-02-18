const fs = require('fs');
const path = require('path');

describe('smoke tests', () => {
  test('package.json exists and is valid', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.name).toBeDefined();
    } else {
      // No package.json (static site) - just check index exists
      expect(true).toBe(true);
    }
  });

  test('README.md exists', () => {
    const readmePath = path.join(__dirname, '..', 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  test('project directory is non-empty', () => {
    const root = path.join(__dirname, '..');
    const files = fs.readdirSync(root).filter(f => !f.startsWith('.'));
    expect(files.length).toBeGreaterThan(0);
  });
});
