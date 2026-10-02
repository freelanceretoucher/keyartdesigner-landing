// Click-to-enlarge lightbox for the work mosaic, with swipe/arrow navigation
// between pieces. Click a tile to open, swipe or use the arrow buttons /
// arrow keys to move through the gallery, close via the X, Escape, or
// clicking the backdrop.
(function () {
  var mosaic = document.getElementById('mosaic');
  if (!mosaic) return;

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var closeBtn = document.getElementById('lightboxClose');
  var prevBtn = document.getElementById('lightboxPrev');
  var nextBtn = document.getElementById('lightboxNext');

  var items = Array.prototype.slice.call(mosaic.querySelectorAll('figure img'));
  var currentIndex = -1;

  function showIndex(i) {
    if (!items.length) return;
    currentIndex = (i + items.length) % items.length;
    var img = items[currentIndex];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = img.dataset.title || '';
  }

  function open(img) {
    var idx = items.indexOf(img);
    showIndex(idx === -1 ? 0 : idx);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  function next() { showIndex(currentIndex + 1); }
  function prev() { showIndex(currentIndex - 1); }

  mosaic.addEventListener('click', function (e) {
    var img = e.target.closest('figure img');
    if (img) open(img);
  });

  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', function (e) { e.stopPropagation(); next(); });
  prevBtn.addEventListener('click', function (e) { e.stopPropagation(); prev(); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  window.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Swipe left/right to navigate on touch devices.
  var touchStartX = 0, touchStartY = 0, touchDeltaX = 0, touchDeltaY = 0;
  lightbox.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
    touchDeltaX = 0; touchDeltaY = 0;
  }, { passive: true });
  lightbox.addEventListener('touchmove', function (e) {
    var t = e.changedTouches[0];
    touchDeltaX = t.clientX - touchStartX;
    touchDeltaY = t.clientY - touchStartY;
  }, { passive: true });
  lightbox.addEventListener('touchend', function () {
    if (Math.abs(touchDeltaX) > 50 && Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
      if (touchDeltaX < 0) next(); else prev();
    }
  });
})();
