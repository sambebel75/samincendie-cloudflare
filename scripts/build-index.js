/**
 * build-index.js
 * Construit l'index de recherche Lunr.js depuis articles-classification.json
 * et le sauvegarde dans src/_data/search-index.json
 */
const fs   = require('fs');
const path = require('path');
const lunr = require('lunr');

const CLASSIFICATION_FILE = 'C:\\Users\\moi\\original\\Usersmoioriginalweb-scraper\\full-data\\articles-classification.json';
const SCRAPED_DIR         = 'C:\\Users\\moi\\original\\Usersmoioriginalweb-scraper\\full-data';
const OUTPUT_FILE         = path.join(__dirname, '..', 'src', '_data', 'search-index.json');
const crypto = require('crypto');

function urlToSlug(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function getFullText(scraped) {
  if (!scraped) return '';
  const content = scraped.content || scraped;
  const title   = content.title || '';
  const h1 = (content.headings && content.headings.h1) ? content.headings.h1.join(' ') : '';
  const h2 = (content.headings && content.headings.h2) ? content.headings.h2.join(' ') : '';
  const h3 = (content.headings && content.headings.h3) ? content.headings.h3.join(' ') : '';
  const paras = Array.isArray(content.paragraphs) ? content.paragraphs.join(' ') : '';
  const desc  = (content.metadata && content.metadata.description) || '';
  const kw    = (content.metadata && content.metadata.keywords) || '';
  return [title, h1, h2, h3, paras, desc, kw].join(' ');
}

async function main() {
  if (!fs.existsSync(CLASSIFICATION_FILE)) {
    console.error('ERREUR: articles-classification.json introuvable');
    process.exit(1);
  }

  const classification = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf-8'));
  const articles = Object.entries(classification.articles || {});
  console.log('Construction de l\'index pour ' + articles.length + ' articles...');

  const documents = [];

  for (const [url, info] of articles) {
    const slug     = urlToSlug(url);
    const cat      = info.primaryCategory ? info.primaryCategory.code : 'AUTRES';
    const title    = info.title || 'Sans titre';
    const codes    = (info.assignedCodes || []).join(' ');

    let fullText = title + ' ' + codes;

    // Enrichir avec le contenu scrappé si disponible
    const scrapedPath = path.join(SCRAPED_DIR, slug + '.json');
    if (fs.existsSync(scrapedPath)) {
      try {
        const scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));
        fullText = getFullText(scraped);
      } catch (e) { /* ignore */ }
    }

    documents.push({
      id:              slug,
      url:             url,
      title:           title,
      primaryCategory: cat,
      assignedCodes:   codes,
      content:         fullText.slice(0, 5000) // limite taille
    });
  }

  console.log('Indexation Lunr...');

  const idx = lunr(function() {
    this.ref('id');
    this.field('title',           { boost: 10 });
    this.field('primaryCategory', { boost: 8 });
    this.field('assignedCodes',   { boost: 6 });
    this.field('content',         { boost: 1 });
    documents.forEach(d => this.add(d));
  });

  // Sauvegarder index + documents (pour lookup des métadonnées)
  const output = {
    created_at: new Date().toISOString(),
    total:      documents.length,
    index:      idx.toJSON(),
    documents:  documents.map(d => ({
      id:              d.id,
      url:             d.url,
      title:           d.title,
      primaryCategory: d.primaryCategory,
      assignedCodes:   d.assignedCodes
      // pas de content dans la lookup pour économiser la taille KV
    }))
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf-8');

  const sizeKb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log('\n=== INDEX CONSTRUIT ===');
  console.log('Documents indexés: ' + documents.length);
  console.log('Taille du fichier: ' + sizeKb + ' KB');
  console.log('Fichier: ' + OUTPUT_FILE);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
