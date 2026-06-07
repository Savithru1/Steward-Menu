const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '.open-next', 'assets');

// Ensure .assetsignore exists so wrangler doesn't complain if _worker.js
// accidentally ends up in the assets directory.
const ignoreFile = path.join(assetsDir, '.assetsignore');
if (!fs.existsSync(ignoreFile)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(ignoreFile, '# Exclude worker files from public asset upload\n_worker.js\n');
  console.log('✅ Created .open-next/assets/.assetsignore');
}

console.log('✅ Build ready. Deploy with: npx wrangler deploy');
