const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, description) {
  console.log(`\n[BUILD] ${description}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: __dirname });
    console.log(`[OK] ${description} completed`);
    return true;
  } catch (error) {
    console.error(`[ERROR] ${description} failed`);
    return false;
  }
}

console.log('='.repeat(50));
console.log('Starting production build...');
console.log('='.repeat(50));

// Step 1: Build frontend with Vite
if (!run('npx vite build', 'Building frontend with Vite')) {
  process.exit(1);
}

// Step 2: Compile server with TypeScript using tsconfig.server.json
if (!run('npx tsc --project tsconfig.server.json', 'Compiling server TypeScript')) {
  process.exit(1);
}

// Step 3: Move compiled server to dist/index.cjs
const sourcePath = path.join(__dirname, 'dist', 'server', 'index.js');
const destPath = path.join(__dirname, 'dist', 'index.cjs');

try {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log('[OK] Copied server/index.js to index.cjs');
  } else {
    console.error('[ERROR] dist/server/index.js not found');
    process.exit(1);
  }
} catch (error) {
  console.error('[ERROR] Failed to move server file:', error.message);
  process.exit(1);
}

// Step 4: Verify build output
console.log('\n' + '='.repeat(50));
console.log('Build verification:');

const requiredFiles = [
  'dist/index.cjs',
  'dist/public/index.html'
];

let allGood = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`[OK] ${file} (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`[MISSING] ${file}`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\n' + '='.repeat(50));
  console.log('BUILD SUCCESSFUL - Ready for deployment!');
  console.log('='.repeat(50));
} else {
  console.log('\n[ERROR] Build incomplete - some files are missing');
  process.exit(1);
}
