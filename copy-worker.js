const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '.open-next');
const assetsDir = path.join(openNextDir, 'assets');
const workerSrc = path.join(openNextDir, 'worker.js');
const workerDest = path.join(openNextDir, '_worker.js');

// 1. Copy worker.js to _worker.js
if (!fs.existsSync(workerSrc)) {
  console.error('❌ .open-next/worker.js not found. Run `@opennextjs/cloudflare build` first.');
  process.exit(1);
}
fs.copyFileSync(workerSrc, workerDest);
console.log('✅ Copied worker.js → _worker.js');

// 2. Hoist assets and cleanup
if (fs.existsSync(assetsDir)) {
  console.log('⚙️ Hoisting assets to .open-next root...');
  fs.cpSync(assetsDir, openNextDir, { recursive: true });
  console.log('✅ Assets hoisted.');
  
  console.log('🧹 Cleaning up assets/ folder...');
  fs.rmSync(assetsDir, { recursive: true, force: true });
  console.log('✅ Cleanup complete.');
} else {
  console.warn('⚠️ No assets directory found to hoist.');
}

// 3. Create _routes.json to exclude static assets from the worker
const routesConfig = {
  version: 1,
  include: ["/*"],
  exclude: ["/_next/static/*", "/favicon.ico"]
};
fs.writeFileSync(
  path.join(openNextDir, '_routes.json'),
  JSON.stringify(routesConfig, null, 2)
);
console.log('✅ Created _routes.json');

console.log('🎉 Pages build prepared inside .open-next/');
