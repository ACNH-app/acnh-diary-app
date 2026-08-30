const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'acnh-diary-mobile/src/data/content/catalog/catalog.json');
const cacheRoot = path.join(root, 'dataset/images/offline_cache');
const concurrency = 8;

function cacheKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function cachedPath(url) {
  const key = cacheKey(url);
  for (const extension of ['.png', '.jpg', '.jpeg']) {
    const candidate = path.join(cacheRoot, `${key}${extension}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) return candidate;
  }
  return path.join(cacheRoot, `${key}.png`);
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    const temporary = `${target}.missing-download.part`;
    const child = spawn('curl', [
      '-L', '--fail', '--silent', '--show-error', '--retry', '3',
      '--connect-timeout', '15', '--max-time', '120',
      '-A', 'ACNH-Diary-Mobile/1.0', url, '-o', temporary,
    ], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        fs.rmSync(temporary, { force: true });
        reject(new Error(`curl exited ${code}: ${url}`));
        return;
      }
      if (!fs.existsSync(temporary) || fs.statSync(temporary).size === 0) {
        fs.rmSync(temporary, { force: true });
        reject(new Error(`empty response: ${url}`));
        return;
      }
      fs.renameSync(temporary, target);
      resolve();
    });
  });
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const urls = [...new Set(
    catalog.items
      .filter((item) => item.imageUrl && !item.assetType && !item.assetId)
      .map((item) => item.imageUrl),
  )];
  fs.mkdirSync(cacheRoot, { recursive: true });

  const pending = urls.filter((url) => !fs.existsSync(cachedPath(url)));
  let next = 0;
  let downloaded = 0;
  const failures = [];
  async function worker() {
    while (next < pending.length) {
      const url = pending[next++];
      const target = cachedPath(url);
      try {
        await download(url, target);
        downloaded += 1;
      } catch (error) {
        failures.push(String(error.message || error));
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
  console.log(JSON.stringify({ requested: urls.length, alreadyCached: urls.length - pending.length, downloaded, failed: failures.length }));
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  }
}

main();
