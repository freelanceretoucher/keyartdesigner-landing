(async () => {
  // Preserve static content immediately; public data only enhances it.
  async function json(url, options={}) {
    const r=await fetch(url,{...options,signal:AbortSignal.timeout(4500)});
    if(!r.ok)throw new Error('Data unavailable');return r.json();
  }
  const artwork=async()=>{
    let payload;
    try { const cached=JSON.parse(localStorage.getItem('landing-releases-v1')||'null');if(cached && Date.now()-cached.at<21600000)payload=cached.data; } catch {}
    if(!payload){payload=await json('/api/recent-posters');try{localStorage.setItem('landing-releases-v1',JSON.stringify({at:Date.now(),data:payload}));}catch{}}
    if(!Array.isArray(payload.posters)||payload.posters.length<12)return;
    const posters=payload.posters.filter(p=>typeof p.title==='string'&&/^https:\/\/image\.tmdb\.org\/t\/p\/w342\/[a-zA-Z0-9._-]+$/.test(p.image));
    if(posters.length<12)return;
    const probe=posters.slice(0,12).map(p=>new Promise(resolve=>{const i=new Image();const timer=setTimeout(()=>resolve(false),3000);i.onload=()=>{clearTimeout(timer);resolve(true)};i.onerror=()=>{clearTimeout(timer);resolve(false)};i.src=p.image;}));
    if(!(await Promise.all(probe)).every(Boolean))return;
    const lanes=document.querySelectorAll('.reference-track');
    lanes.forEach((track,index)=>{
      const group=document.createElement('div');group.className='reference-group';
      posters.slice(index*6,index*6+6).forEach(p=>{const i=document.createElement('img');i.src=p.image;i.alt=p.title+' — reference artwork';i.width=300;i.height=450;group.append(i);});
      if(group.children.length<4)return;
      const copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.querySelectorAll('img').forEach(i=>i.alt='');track.replaceChildren(group,copy);
    });
    document.querySelectorAll('.filter-posters img').forEach((i,n)=>{if(posters[n]){i.src=posters[n].image;i.alt=posters[n].title+' — illustrative reference artwork';}});
  };
  const portfolio=async()=>{
    if(!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
    const base=new URL(window.SUPABASE_URL);if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))return;
    const rows=await json(base.origin+'/rest/v1/posters?select=title,image_path,alt_text,tags',{headers:{apikey:window.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+window.SUPABASE_PUBLISHABLE_KEY}});
    if(!Array.isArray(rows)||!rows.length)return;
    const track=document.querySelector('.portfolio-carousel .projectgrid');const frag=document.createDocumentFragment();
    for(const row of rows){if(!row.image_path||!row.title)continue;
      const a=document.createElement('a');a.className='project';a.href='https://www.freelanceretoucher.com/';a.target='_blank';a.rel='noreferrer';
      const art=document.createElement('div');art.className='art';const i=document.createElement('img');i.loading='lazy';i.src=base.origin+'/storage/v1/object/public/posters/'+row.image_path.split('/').map(encodeURIComponent).join('/');i.alt=row.alt_text||row.title;art.append(i);
      const caption=document.createElement('div');caption.className='projectcaption';const h=document.createElement('h3');h.textContent=row.title;const arrow=document.createElement('span');arrow.textContent='↗';caption.append(h,arrow);a.append(art,caption);frag.append(a);
    }
    if(frag.children.length)track.append(frag);
  };
  await Promise.allSettled([artwork(),portfolio()]);
  const script=document.createElement('script');script.src='landing-motion.js';document.body.append(script);
})();
