(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  function setup() {
    observer?.disconnect();
    document.documentElement.classList.remove('motion-ready');
    document.querySelectorAll('.reveal').forEach(node => node.classList.remove('reveal', 'is-visible'));
    if (preference.matches || !('IntersectionObserver' in window)) return;
    const nodes = document.querySelectorAll('.feature-heading, .feature-card, .free-promise, .sectionhead, .steps article, .bridge > .eyebrow, .bridge > h2, .bio, .workhead, .project, .selected > .textlink, .contact > *');
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    nodes.forEach((node, index) => {
      node.classList.add('reveal');
      node.style.setProperty('--reveal-delay', `${(index % 3) * 65}ms`);
      observer.observe(node);
    });
    document.documentElement.classList.add('motion-ready');
  }
  setup();
  preference.addEventListener('change', setup);
})();

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const input = document.querySelector('#q');
  const wrapper = input.closest('.search-input');
  const example = document.querySelector('.typed-example');
  const phrases = ['snow-covered mountains', 'a lone astronaut in space', 'red background, bold white type', 'a tiny person in a vast landscape'];
  let timer, phrase = 0, length = 0, deleting = false;
  function type() {
    clearTimeout(timer);
    wrapper.classList.toggle('has-value', !!input.value);
    if (input.value || document.activeElement === input || document.hidden) return;
    if (reduce.matches) { example.textContent = 'Try “snow-covered mountains”'; return; }
    const text = phrases[phrase];
    length += deleting ? -1 : 1;
    example.textContent = 'Try “' + text.slice(0, length) + (length === text.length ? '”' : '');
    let delay = deleting ? 32 : 65;
    if (!deleting && length >= text.length) { deleting = true; delay = 2200; }
    else if (deleting && length <= 0) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 450; }
    timer = setTimeout(type, delay);
  }
  input.addEventListener('focus', () => clearTimeout(timer));
  input.addEventListener('input', () => { wrapper.classList.toggle('has-value', !!input.value); clearTimeout(timer); });
  input.addEventListener('blur', type);
  reduce.addEventListener('change', type);
  document.addEventListener('visibilitychange', type);
  type();

  const reference = document.querySelector('.reference-carousel');
  // Fill each lane with enough complete cycles for ultrawide viewports.
  function fillReferenceLanes() {
    reference.querySelectorAll('.reference-track').forEach(track => {
      const original = track.querySelector('.reference-group');
      const groupWidth = original.getBoundingClientRect().width;
      if (!groupWidth) return;
      const needed = Math.max(3, Math.ceil(reference.clientWidth / groupWidth) + 2);
      while (track.children.length < needed) {
        const copy = original.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('img').forEach(img => { img.alt = ''; });
        track.appendChild(copy);
      }
      track.style.setProperty('--cycle-width', groupWidth + 'px');
    });
  }
  fillReferenceLanes();
  new ResizeObserver(fillReferenceLanes).observe(reference);

  const carousel = document.querySelector('.portfolio-carousel');
  const track = carousel.querySelector('.projectgrid');
  const original = [...track.children];
  original.forEach(node => {
    const copy = node.cloneNode(true);
    copy.classList.remove('reveal', 'is-visible');
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('tabindex', '-1');
    copy.dataset.carouselCopy = 'true';
    track.appendChild(copy);
  });
  let visible = false, paused = false, hovering = false, frame, last = 0, holdUntil = 0, carry = 0;
  function canMove() { return visible && !paused && !hovering && !reduce.matches && !document.hidden && !carousel.contains(document.activeElement); }
  function start() { if (!frame && canMove()) { last = 0; frame = requestAnimationFrame(tick); } }
  function tick(now) {
    frame = null;
    if (!canMove()) return;
    if (last && now > holdUntil) {
      const cycle = track.children[original.length].offsetLeft - track.children[0].offsetLeft;
      carry += Math.min(now - last, 50) * .022;
      const step = Math.floor(carry);
      carousel.scrollLeft += step;
      carry -= step;
      if (carousel.scrollLeft >= cycle) carousel.scrollLeft -= cycle;
    }
    last = now;
    frame = requestAnimationFrame(tick);
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; start(); }).observe(carousel);
  carousel.addEventListener('pointerenter', () => { hovering = true; });
  carousel.addEventListener('pointerleave', () => { hovering = false; start(); });
  carousel.addEventListener('focusout', () => setTimeout(start, 0));
  ['touchstart', 'wheel', 'keydown'].forEach(event => carousel.addEventListener(event, () => { holdUntil = performance.now() + 8000; }, {passive:true}));
  const toggle = document.querySelector('.work-toggle');
  toggle.addEventListener('click', () => { paused = !paused; toggle.textContent = paused ? 'Play' : 'Pause'; toggle.setAttribute('aria-pressed', String(paused)); start(); });
  function move(direction) {
    holdUntil = performance.now() + 8000;
    carousel.scrollBy({ left: direction * (original[0].getBoundingClientRect().width + 22), behavior: reduce.matches ? 'instant' : 'smooth' });
  }
  document.querySelector('.work-prev').addEventListener('click', () => move(-1));
  document.querySelector('.work-next').addEventListener('click', () => move(1));
  function updatePreference() {
    track.querySelectorAll('[data-carousel-copy]').forEach(node => { node.hidden = reduce.matches; });
    toggle.hidden = reduce.matches;
    start();
  }
  reduce.addEventListener('change', updatePreference);
  document.addEventListener('visibilitychange', start);
  updatePreference();
})();
