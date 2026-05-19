/**
 * import-articles.js
 * Lit articles-classification.json et génère un fichier .md par article
 * dans src/articles/ pour Eleventy.
 */
const fs   = require('fs');
const path = require('path');

const CLASSIFICATION_FILE = 'C:\\Users\\moi\\original\\Usersmoioriginalweb-scraper\\full-data\\articles-classification.json';
const SCRAPED_DIR         = 'C:\\Users\\moi\\original\\Usersmoioriginalweb-scraper\\full-data';
const OUTPUT_DIR          = path.join(__dirname, '..', 'src', 'articles');
const crypto = require('crypto');

const CATEGORY_NAMES = {
  ERP:    'Établissements Recevant du Public',
  IGH:    'Immeubles de Grande Hauteur',
  HAB:    'Habitations',
  BUP:    'Bâtiments Usage Professionnel',
  ICPE:   "Installations Classées (ICPE)",
  AUTRES: 'Autres Catégories'
};

function urlToSlug(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function escapeYaml(str) {
  if (!str) return '""';
  // Échappe les guillemets et retours à la ligne pour le YAML
  return '"' + String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').trim() + '"';
}

function getDescription(scraped) {
  if (!scraped) return '';
  const content = scraped.content || scraped;
  if (content.metadata && content.metadata.description) return content.metadata.description;
  const paras = Array.isArray(content.paragraphs) ? content.paragraphs : [];
  return paras.slice(0, 2).join(' ').slice(0, 300);
}

function getExcerpt(scraped) {
  if (!scraped) return '';
  const content = scraped.content || scraped;
  const paras = Array.isArray(content.paragraphs) ? content.paragraphs : [];
  return paras.slice(0, 3).join('\n\n');
}

function getKeywords(scraped) {
  if (!scraped) return '';
  const content = scraped.content || scraped;
  if (content.metadata && content.metadata.keywords) return content.metadata.keywords;
  return '';
}

async function main() {
  if (!fs.existsSync(CLASSIFICATION_FILE)) {
    console.error('ERREUR: articles-classification.json introuvable');
    process.exit(1);
  }

  // Nettoyer le dossier output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const existing = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.md'));
  existing.forEach(f => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
  console.log('Dossier src/articles/ nettoyé (' + existing.length + ' anciens fichiers supprimés)');

  const classification = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf-8'));
  const articles = Object.entries(classification.articles || {});
  console.log('Articles à importer: ' + articles.length);

  let created = 0;
  let errors  = 0;

  for (const [url, info] of articles) {
    try {
      const slug = urlToSlug(url);
      const scrapedPath = path.join(SCRAPED_DIR, slug + '.json');

      let scraped = null;
      if (fs.existsSync(scrapedPath)) {
        scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));
      }

      const cat   = info.primaryCategory ? info.primaryCategory.code : 'AUTRES';
      const title = info.title || 'Sans titre';
      const description = getDescription(scraped);
      const excerpt     = getExcerpt(scraped);
      const keywords    = getKeywords(scraped);
      const confidence  = info.primaryCategory ? info.primaryCategory.confidence : 0;
      const codes       = (info.assignedCodes || []).join(', ');
      const method      = info.classificationMethod || 'unknown';

      // Nom du fichier : slug MD5 + .md
      const filename = slug + '.md';
      const filepath = path.join(OUTPUT_DIR, filename);

      const frontmatter = [
        '---',
        'layout: article',
        'title: '        + escapeYaml(title),
        'url_source: '   + escapeYaml(url),
        'primaryCategory: ' + escapeYaml(cat),
        'categoryName: ' + escapeYaml(CATEGORY_NAMES[cat] || cat),
        'confidence: '   + confidence,
        'assignedCodes: ' + escapeYaml(codes),
        'classificationMethod: ' + escapeYaml(method),
        'description: '  + escapeYaml(description),
        'keywords: '     + escapeYaml(keywords),
        'slug: '         + escapeYaml(slug),
        '---',
        '',
        excerpt || '*Contenu non disponible*'
      ].join('\n');

      fs.writeFileSync(filepath, frontmatter, 'utf-8');
      created++;

      if (created % 200 === 0) {
        console.log('  Créé: ' + created + '/' + articles.length + '...');
      }
    } catch (err) {
      errors++;
      console.error('Erreur sur', url, ':', err.message);
    }
  }

  console.log('\n=== IMPORT TERMINÉ ===');
  console.log('Fichiers .md créés: ' + created);
  console.log('Erreurs: ' + errors);
  console.log('Dossier: ' + OUTPUT_DIR);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
