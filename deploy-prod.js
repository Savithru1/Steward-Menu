const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const envLocalPath = path.join(__dirname, '.env.local');
const envLocalTmpPath = path.join(__dirname, '.env.local.tmp');

let renamed = false;

// 1. Rename .env.local to .env.local.tmp if it exists
if (fs.existsSync(envLocalPath)) {
  console.log('⚙️ Temporarily renaming .env.local to .env.local.tmp to prevent build-time override...');
  fs.renameSync(envLocalPath, envLocalTmpPath);
  renamed = true;
}

try {
  // 2. Build the Cloudflare OpenNext worker
  console.log('🚀 Compiling production OpenNext bundle...');
  const buildResult = spawnSync('npm', ['run', 'build:cloudflare'], {
    stdio: 'inherit',
    shell: true,
  });

  if (buildResult.status !== 0) {
    console.error('❌ Build failed.');
    process.exit(buildResult.status || 1);
  }

  // 3. Deploy the compiled bundle to Cloudflare Pages
  console.log('🚀 Uploading bundle to Cloudflare Pages...');
  const deployResult = spawnSync('npx', ['wrangler', 'pages', 'deploy', '.open-next', '--branch', 'main'], {
    stdio: 'inherit',
    shell: true,
  });

  if (deployResult.status !== 0) {
    console.error('❌ Deployment failed.');
    process.exit(deployResult.status || 1);
  }

  console.log('🎉 Production deployment complete!');
} catch (error) {
  console.error('❌ An error occurred during deployment:', error);
  process.exit(1);
} finally {
  // 4. Always restore .env.local
  if (renamed && fs.existsSync(envLocalTmpPath)) {
    console.log('⚙️ Restoring .env.local...');
    fs.renameSync(envLocalTmpPath, envLocalPath);
    console.log('✅ .env.local restored successfully.');
  }
}
