/* =====================
   ENV
   ===================== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGsap      = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

if (hasGsap) gsap.registerPlugin(ScrollTrigger);
else document.documentElement.classList.add('no-gsap');
document.body.classList.add('revealed');

/* =====================
   SMOOTH SCROLL (Lenis)
   ===================== */
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({ lerp: 0.1 });
  if (hasGsap) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

/* =====================
   BUTTON SWIPE LABEL (mirrors visible text into data-label for ::before)
   ===================== */
$$('.btn').forEach(btn => btn.setAttribute('data-label', btn.textContent.trim()));

/* =====================
   NAV — mobile toggle, active link, hide on scroll down
   ===================== */
const nav        = $('.nav');
const hamburger  = $('.nav-hamburger');
const mobileMenu = $('.nav-mobile');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });
  $$('a', mobileMenu).forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

const currentFile = window.location.pathname.split('/').pop() || 'index.html';
$$('.nav-links a, .nav-mobile a').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentFile || (currentFile === '' && href === 'index.html')) link.classList.add('active');
});

if (nav) {
  let lastY = window.scrollY;
  let anchorY = lastY;
  const onScroll = () => {
    const y = window.scrollY;
    const down = y > lastY;
    lastY = y;
    nav.classList.toggle('scrolled', y > 12);
    const menuOpen = mobileMenu && mobileMenu.classList.contains('open');
    if (y < 160 || menuOpen)       { nav.classList.remove('nav-hidden'); anchorY = y; }
    else if (y - anchorY > 48)     { nav.classList.add('nav-hidden');    anchorY = y; }
    else if (anchorY - y > 48)     { nav.classList.remove('nav-hidden'); anchorY = y; }
    else if ((down && y < anchorY) || (!down && y > anchorY)) anchorY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* =====================
   TEXT SPLIT — words that settle out of a blur
   ===================== */
function splitWords(el) {
  let i = 0;
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'word';
          w.textContent = part;
          w.style.setProperty('--i', i++);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
}

/* =====================
   HERO — headline words rise in, soft light follows the pointer
   ===================== */
const hero      = $('.hero');
const heroTitle = $('.hero-headline .h-display');

if (heroTitle) {
  if (!reduceMotion) splitWords(heroTitle);
  heroTitle.classList.add('is-split');
}

const orb = $('.hero-orb');
if (hero && orb && finePointer && !reduceMotion) {
  let tx = 0, ty = 0, x = 0, y = 0, running = false;
  const tick = () => {
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    orb.style.setProperty('--ox', `${x.toFixed(1)}px`);
    orb.style.setProperty('--oy', `${y.toFixed(1)}px`);
    if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) requestAnimationFrame(tick);
    else running = false;
  };
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left - r.width / 2) * 0.25;
    ty = (e.clientY - r.top - r.height / 2) * 0.25;
    if (!running) { running = true; requestAnimationFrame(tick); }
  });
  hero.addEventListener('mouseleave', () => {
    tx = 0; ty = 0;
    if (!running) { running = true; requestAnimationFrame(tick); }
  });
}

const polarityBtn = $('.polarity-btn');
if (polarityBtn && hero) {
  polarityBtn.addEventListener('click', () => {
    hero.classList.toggle('inverted');
    $('span', polarityBtn).textContent = hero.classList.contains('inverted') ? 'Mode clair' : 'Mode contraste';
  });
}

/* =====================
   SECTION HEADINGS
   ===================== */
const splitHeads = [];
if (!reduceMotion) {
  $$('main h2, .page-hero h1, .contact-simple h1').forEach(h => {
    splitWords(h);
    h.classList.add('split-h');
    splitHeads.push(h);
  });
}

/* =====================
   SCROLL REVEAL
   ===================== */
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add(el.classList.contains('split-h') ? 'in-view' : 'visible');
      revealObserver.unobserve(el);
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);
[...$$('.reveal'), ...splitHeads].forEach(el => revealObserver.observe(el));

/* =====================
   COMPARE — rows settle in one after another
   ===================== */
const table = $('.compare-table');
if (table) {
  const rows = $$('tbody tr', table);
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    rows.forEach((row, i) => setTimeout(() => row.classList.add('visible'), i * 90));
    io.disconnect();
  }, { threshold: 0.2 });
  io.observe(table);
}

/* =====================
   CONTACT — copy address
   ===================== */
const copyBtn = $('.copy-btn');
if (copyBtn) {
  const label = $('.copy-label', copyBtn);
  const original = label.textContent;
  copyBtn.addEventListener('click', () => {
    const address = copyBtn.dataset.copy;
    if (!navigator.clipboard) { label.textContent = address; return; }
    navigator.clipboard.writeText(address).then(() => {
      label.textContent = 'Adresse copiée';
      copyBtn.classList.add('is-copied');
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(() => {
        label.textContent = original;
        copyBtn.classList.remove('is-copied');
      }, 2200);
    }).catch(() => { label.textContent = address; });
  });
}

/* =====================
   SCROLL-LINKED SCENES (GSAP)
   ===================== */
if (hasGsap) {
  // Hero content drifts up and fades as you leave it
  if (hero) {
    gsap.to($('.container', hero), {
      y: -70, opacity: 0.35, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // Process bar fills as the steps pass through the viewport
  const stepsBar = $('.steps-progress span');
  if (stepsBar) {
    gsap.fromTo(stepsBar, { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.steps-grid', start: 'top 85%', end: 'bottom 60%', scrub: 0.8 }
    });
  }

  // CTA panel opens from a rounded card to full bleed
  const cta = $('.cta-final');
  if (cta) {
    gsap.fromTo(cta,
      { clipPath: 'inset(7% 5% 7% 5% round 28px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: cta, start: 'top 95%', end: 'top 35%', scrub: 0.8 }
      }
    );
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
