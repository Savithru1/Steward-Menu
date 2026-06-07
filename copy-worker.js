const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '.open-next');
const assetsDir  = path.join(openNextDir, 'assets');
const workerSrc  = path.join(openNextDir, 'worker.js');
const workerDest = path.join(openNextDir, '_worker.js');

// ── Step 1: Copy worker.js → _worker.js at .open-next root ───────────────────
if (!fs.existsSync(workerSrc)) {
  console.error('❌ .open-next/worker.js not found. Run `npx @opennextjs/cloudflare build` first.');
  process.exit(1);
}
fs.copyFileSync(workerSrc, workerDest);
console.log('✅ Copied worker.js → .open-next/_worker.js');

// ── Step 2: Hoist assets/* up to .open-next root ─────────────────────────────
// Cloudflare Pages serves pages_build_output_dir as the static root.
// _worker.js must be at the root alongside the static files it references.
// OpenNext puts static files in assets/ but we need them at root level.
function copyDirContents(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirContents(assetsDir, openNextDir);
console.log('✅ Hoisted .open-next/assets/* → .open-next/ (static files at root)');
console.log('');
console.log('📦 Deploy with: npx wrangler pages deploy .open-next --branch main');
