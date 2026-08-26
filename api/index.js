/* EZO STİLE v2 - Central Vercel Catch-All Router (1 Single Function for Vercel Hobby Limit) */
import url from 'url';

function extractRoutePath(req) {
  const reqUrl = req.url || '';
  const parsedUrl = url.parse(reqUrl, true);

  // A. Check explicit query parameter 'path' (e.g. ?path=booking/create)
  if (parsedUrl.query && parsedUrl.query.path) {
    let p = String(parsedUrl.query.path).trim();
    if (p && p !== 'index' && p !== 'api') return p;
  }

  // B. If req.url contains ?path= or &path=
  if (reqUrl.includes('path=')) {
    const qMatch = reqUrl.match(/[?&]path=([^&]+)/);
    if (qMatch && qMatch[1]) {
      let p = decodeURIComponent(qMatch[1]).trim();
      if (p && p !== 'index' && p !== 'api') return p;
    }
  }

  // C. Check headers if passed by Vercel
  const matchedHeader = req.headers && (req.headers['x-matched-path'] || req.headers['x-now-route-matches']);
  if (matchedHeader) {
    const match = String(matchedHeader).match(/path=([^&]+)/);
    if (match && match[1]) {
      let p = match[1].trim();
      if (p && p !== 'index' && p !== 'api') return p;
    }
  }

  // D. Extract directly from pathname (e.g. /api/booking/create -> booking/create)
  let rawPath = parsedUrl.pathname || reqUrl.split('?')[0] || '';
  
  rawPath = rawPath
    .replace(/^\/?(api\/)?/, '')
    .replace(/^index\/?/, '')
    .replace(/\/$/, '')
    .trim();

  return rawPath;
}

export default async function handler(req, res) {
  try {
    const routePath = extractRoutePath(req);

    console.log(`[API ROUTER] Incoming Request -> Method: ${req.method}, URL: ${req.url}, Extracted Route: '${routePath}'`);

    if (!routePath || routePath === 'index' || routePath === 'api') {
      return res.status(200).json({
        status: 'online',
        service: 'EZO STİLE v2 Central API Router',
        environment: 'VERCEL_FUNCTIONS_SINGLE_ROUTER',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const handlerModule = await import(`../server/handlers/${routePath}.js`);
      if (handlerModule && typeof handlerModule.default === 'function') {
        return await handlerModule.default(req, res);
      }
    } catch (importErr) {
      console.warn(`[API ROUTER] Handler module not found for route: '${routePath}'`, importErr.message);
      return res.status(404).json({
        error: `API endpoint '${routePath}' bulunamadı veya Vercel Router tarafından eşleştirilemedi.`,
        routePath,
        url: req.url
      });
    }

  } catch (err) {
    console.error('[API ROUTER ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}