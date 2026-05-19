/**
 * upload-kv.js
 * Upload l'index de recherche dans Cloudflare KV via l'API REST
 * Variables d'environnement requises :
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 *   KV_NAMESPACE_ID
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const https = require('https');

const INDEX_FILE = path.join(__dirname, '..', 'src', '_data', 'search-index.json');

const TOKEN        = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID   = process.env.CLOUDFLARE_ACCOUNT_ID;
const NAMESPACE_ID = process.env.KV_NAMESPACE_ID;

if (!TOKEN || !ACCOUNT_ID || !NAMESPACE_ID) {
  console.error('Variables manquantes: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, KV_NAMESPACE_ID');
  process.exit(1);
}

async function uploadToKV(key, value) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(value), 'utf-8');
    const options = {
      hostname: 'api.cloudflare.com',
      path:     `/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${key}`,
      method:   'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type':  'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.success) resolve(result);
        else reject(new Error('KV upload failed: ' + JSON.stringify(result.errors)));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error('ERREUR: search-index.json introuvable. Lance d\'abord: npm run build-index');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const sizeKb = Math.round(fs.statSync(INDEX_FILE).size / 1024);
  console.log('Upload de l\'index (' + sizeKb + ' KB) vers Cloudflare KV...');

  try {
    await uploadToKV('search-index-v1', index);
    console.log('Upload réussi ! Clé: search-index-v1');

    // Upload aussi les métadonnées légères séparément pour les filtres rapides
    const meta = {
      created_at: index.created_at,
      total:      index.total,
      categories: {}
    };
    (index.documents || []).forEach(d => {
      if (!meta.categories[d.primaryCategory]) meta.categories[d.primaryCategory] = 0;
      meta.categories[d.primaryCategory]++;
    });
    await uploadToKV('search-meta-v1', meta);
    console.log('Métadonnées uploadées ! Clé: search-meta-v1');
    console.log('\nDistribution dans KV:');
    Object.entries(meta.categories).forEach(([cat, count]) => {
      console.log('  ' + cat + ': ' + count + ' articles');
    });
  } catch (err) {
    console.error('ERREUR upload:', err.message);
    process.exit(1);
  }
}

main();
