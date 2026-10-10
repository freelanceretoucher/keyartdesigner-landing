// Loads the homepage poster mosaic from Supabase instead of hardcoded HTML,
// so Diego can publish/remove posters from admin.html without ever touching
// this file or pushing to GitHub. Runs before script.js (which drives the
// lightbox/density controls) but doesn't need to race it — script.js reads
// the mosaic live off the DOM each time it's used, not once at page load.
(function () {
  var mosaic = document.getElementById('mosaic');
  if (!mosaic || !window.supabase || !window.SUPABASE_URL) return;

  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function publicUrl(imagePath) {
    return client.storage.from('posters').getPublicUrl(imagePath).data.publicUrl;
  }

  function buildFigure(poster) {
    var figure = document.createElement('figure');
    var img = document.createElement('img');
    img.src = publicUrl(poster.image_path);
    img.alt = poster.alt_text || poster.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.title = poster.title;
    if (poster.tags && poster.tags.length) {
      img.dataset.tags = poster.tags.join(', ');
    }
    var figcaption = document.createElement('figcaption');
    figcaption.textContent = poster.title;
    figure.appendChild(img);
    figure.appendChild(figcaption);
    return figure;
  }

  // A per-image ImageObject block, built from each poster's title/alt/tags,
  // so search engines and AI crawlers get machine-readable context for the
  // gallery instead of having to infer it from the images alone.
  function buildImageSchema(posters) {
    if (!posters.length) return;
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: 'Key Art Designer — Portfolio',
      image: posters.map(function (p) {
        return {
          '@type': 'ImageObject',
          contentUrl: publicUrl(p.image_path),
          name: p.title,
          description: p.alt_text || p.title,
          keywords: (p.tags || []).join(', ')
        };
      })
    });
    document.head.appendChild(script);
  }

  client
    .from('posters')
    .select('title, image_path, alt_text, tags')
    .then(function (res) {
      if (res.error) {
        console.error('Could not load posters:', res.error);
        mosaic.innerHTML = '<p class="mosaic-loading">Couldn’t load the gallery just now. Try refreshing.</p>';
        return;
      }
      var posters = res.data || [];
      if (!posters.length) {
        mosaic.innerHTML = '<p class="mosaic-loading">New work coming soon.</p>';
        return;
      }
      posters = shuffle(posters);
      var frag = document.createDocumentFragment();
      posters.forEach(function (p) { frag.appendChild(buildFigure(p)); });
      mosaic.innerHTML = '';
      mosaic.appendChild(frag);
      buildImageSchema(posters);
    });
})();
