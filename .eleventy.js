module.exports = function(eleventyConfig) {
  // Ne pas ignorer src/articles/ même si présent dans .gitignore
  eleventyConfig.setUseGitIgnore(false);

  const CATEGORY_COLORS = {
    ERP:    '#C0392B',
    IGH:    '#1A2E4A',
    HAB:    '#27AE60',
    BUP:    '#8E44AD',
    ICPE:   '#E67E22',
    AUTRES: '#2980B9'
  };

  const CATEGORY_NAMES = {
    ERP:    'Établissements Recevant du Public',
    IGH:    'Immeubles de Grande Hauteur',
    HAB:    'Habitations',
    BUP:    'Bâtiments Usage Professionnel',
    ICPE:   "Installations Classées (ICPE)",
    AUTRES: 'Autres Catégories'
  };

  // Filtres Nunjucks
  eleventyConfig.addNunjucksFilter("categoryColor", (code) => CATEGORY_COLORS[code] || '#2980B9');
  eleventyConfig.addNunjucksFilter("categoryName",  (code) => CATEGORY_NAMES[code]  || 'Autres');
  eleventyConfig.addNunjucksFilter("truncate", (str, len) => {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  });
  eleventyConfig.addNunjucksFilter("slugify", (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
  eleventyConfig.addNunjucksFilter("limit", (arr, n) => {
    if (!arr) return [];
    return arr.slice(0, n);
  });

  // Collections
  eleventyConfig.addCollection("articles", col =>
    col.getFilteredByGlob("src/articles/**/*.md")
      .sort((a, b) => (a.data.title || '').localeCompare(b.data.title || '', 'fr'))
  );

  eleventyConfig.addCollection("articlesByCategory", col => {
    const articles = col.getFilteredByGlob("src/articles/**/*.md");
    const grouped = {};
    articles.forEach(a => {
      const c = a.data.primaryCategory || 'AUTRES';
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(a);
    });
    return grouped;
  });

  // Assets statiques
  eleventyConfig.addPassthroughCopy("src/assets");

  return {
    dir: {
      input:   "src",
      output:  "_site",
      layouts: "_includes/layouts",
      includes: "_includes"
    },
    templateFormats:       ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine:    "njk"
  };
};
