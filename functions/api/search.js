/**
 * Cloudflare Pages Function - API de recherche
 * Route: /api/search?q=...&category=...&limit=...
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const query    = (url.searchParams.get('q') || '').trim();
  const category = url.searchParams.get('category') || '';
  const limit    = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
  const page     = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);

  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'public, max-age=300'
  };

  if (!query && !category) {
    return new Response(JSON.stringify({ error: 'Paramètre q ou category requis' }), { status: 400, headers });
  }

  try {
    const searchIndex = await env.SEARCH_INDEX.get('search-index-v1', 'json');
    if (!searchIndex) {
      return new Response(JSON.stringify({ error: 'Index non disponible' }), { status: 503, headers });
    }

    let results = searchIndex.documents || [];

    // Filtre par catégorie
    if (category) {
      results = results.filter(d => d.primaryCategory === category.toUpperCase());
    }

    // Recherche textuelle simple (sans Lunr côté Worker pour économiser CPU)
    if (query) {
      const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      results = results.filter(doc => {
        const text = (doc.title + ' ' + doc.assignedCodes + ' ' + doc.primaryCategory).toLowerCase();
        return terms.every(term => text.includes(term));
      });
    }

    // Pagination
    const total  = results.length;
    const offset = (page - 1) * limit;
    const paged  = results.slice(offset, offset + limit);

    return new Response(JSON.stringify({
      query,
      category,
      total,
      page,
      limit,
      results: paged
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erreur serveur', detail: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
