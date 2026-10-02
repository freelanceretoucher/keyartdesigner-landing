// Click-to-enlarge lightbox for the work mosaic. Same interaction as the
// reference site: click a tile, see the full image centered on a dark
// overlay, close via the X, Escape, or clicking the backdrop.
(function () {
  var mosaic = document.getElementById('mosaic');
  if (!mosaic) return;

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var closeBtn = document.getElementById('lightboxClose');

  function open(img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = img.dataset.title || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  mosaic.addEventListener('click', function (e) {
    var img = e.target.closest('figure img');
    if (img) open(img);
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
