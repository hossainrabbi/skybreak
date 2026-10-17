const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { compileTypeScriptCode } = require('./register-ts');

const rootDir = path.resolve(__dirname, '..');
const targetDirs = ['shared', 'server', 'game', 'lib', 'components', 'app', 'tests'];

function collectFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, result);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      result.push(full);
    }
  }
  return result;
}

function verifyLocalImports(filePath, content) {
  const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rel = match[1];
    if (rel.endsWith('.css')) {
      const cssTarget = path.resolve(path.dirname(filePath), rel);
      if (!fs.existsSync(cssTarget)) {
        throw new Error(`Missing CSS import "${rel}" in ${filePath}`);
      }
      continue;
    }
    const base = path.resolve(path.dirname(filePath), rel);
    const candidates = [
      base,
      base + '.ts',
      base + '.tsx',
      base + '.js',
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
    ];
    if (!candidates.some((c) => fs.existsSync(c))) {
      throw new Error(`Unresolved local import "${rel}" in ${filePath}`);
    }
  }
}

function main() {
  console.log('=== SKYBREAK TypeScript & Module Integrity Check ===');

  // If full tsc binary exists in node_modules, run it first
  const localTsc = path.join(
    rootDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
  );
  if (fs.existsSync(localTsc)) {
    console.log('Running local TypeScript compiler (tsc --noEmit)...');
    const res = spawnSync(localTsc, ['--noEmit'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (res.status !== 0) {
      process.exit(res.status || 1);
    }
  }

  let checkedCount = 0;
  for (const sub of targetDirs) {
    const files = collectFiles(path.join(rootDir, sub));
    for (const file of files) {
      const relName = path.relative(rootDir, file);
      const raw = fs.readFileSync(file, 'utf8');
      verifyLocalImports(file, raw);
      compileTypeScriptCode(raw, file);
      checkedCount++;
      console.log(`  [OK] ${relName}`);
    }
  }

  console.log(`\n✅ Successfully verified ${checkedCount} TypeScript/TSX source files with 0 errors.`);
}

main();
