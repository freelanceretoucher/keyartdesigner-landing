// Fixed public feed only. Credentials remain in the existing app proxy.
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  try {
    const upstream = await fetch('https://app.keyartdesigner.com/api/tmdb', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:'/movie/now_playing',params:{language:'en-US',region:'GB',page:1}}),
      signal:AbortSignal.timeout(7000)
    });
    if (!upstream.ok) throw new Error('Feed unavailable');
    const data = await upstream.json();
    const seen = new Set();
    const posters = (data.results || []).filter(x => {
      if (!Number.isInteger(x.id) || typeof x.title !== 'string' || !/^\/[a-zA-Z0-9._-]+$/.test(x.poster_path || '') || seen.has(x.poster_path)) return false;
      seen.add(x.poster_path);return true;
    }).slice(0,16).map(x=>({id:x.id,title:x.title,image:'https://image.tmdb.org/t/p/w342'+x.poster_path}));
    if (posters.length < 8) throw new Error('Insufficient feed');
    res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({posters});
  } catch {res.setHeader('Cache-Control','no-store');return res.status(503).json({posters:[]});}
}
