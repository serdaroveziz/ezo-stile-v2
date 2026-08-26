/* EZO STİLE v2 - Central Vercel Catch-All Router (1 Single Function for Vercel Hobby Limit) */
import url from 'url';

export default async function handler(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    let routePath = parsedUrl.pathname || '';

    if (parsedUrl.query && parsedUrl.query.path) {
      routePath = parsedUrl.query.path;
    }

    // Strip leading /api/ or leading /
    routePath = routePath.replace(/^\/?(api\/)?/, '').replace(/\/$/, '');

    if (!routePath || routePath === 'index') {
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
        routePath
      });
    }

  } catch (err) {
    console.error('[API ROUTER ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}