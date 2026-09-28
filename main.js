/* =====================
   ENV
   ===================== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGsap      = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;
const enteredViaTransition = document.documentElement.classList.contains('nr-enter');
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

if (hasGsap) gsap.registerPlugin(ScrollTrigger);
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
   PAGE TRANSITION — pixel grid fills diagonally, then clears on the next page
   ===================== */
const px = document.createElement('div');
px.className = 'px';
px.setAttribute('aria-hidden', 'true');
document.body.appendChild(px);

function buildPixels() {
  const size = window.innerWidth < 700 ? 70 : 110;
  const cols = Math.ceil(window.innerWidth / size);
  const rows = Math.ceil(window.innerHeight / size);
  px.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  px.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  px.innerHTML = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('i');
      const d = ((c + r) / (cols + rows)) * 280 + Math.random() * 90;
      cell.style.setProperty('--d', `${Math.round(d)}ms`);
      px.appendChild(cell);
    }
  }
}

if (enteredViaTransition) {
  buildPixels();
  px.className = 'px full instant';
  document.documentElement.classList.remove('nr-enter');
  void px.offsetWidth;
  requestAnimationFrame(() => {
    px.className = 'px';
    setTimeout(() => { px.innerHTML = ''; }, 800);
  });
}

document.addEventListener('click', e => {
  if (reduceMotion || e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
  if (a.origin !== location.origin || a.pathname === location.pathname) return;

  e.preventDefault();
  try { sessionStorage.setItem('nr-nav', '1'); } catch (_) {}
  buildPixels();
  void px.offsetWidth;
  px.className = 'px full';
  setTimeout(() => { location.href = a.href; }, 720);
});

// back/forward cache: never come back to a covered page
window.addEventListener('pageshow', e => {
  if (e.persisted) {
    px.className = 'px';
    px.innerHTML = '';
    document.documentElement.classList.remove('nr-enter');
  }
});

/* =====================
   BUTTON SWIPE LABEL (mirrors visible text into data-label for ::before)
   ===================== */
$$('.btn').forEach(btn => btn.setAttribute('data-label', btn.textContent.trim()));

/* =====================
   NAV — mobile toggle + active link
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

/* =====================
   LOGO GLITCH — "not real"
   ===================== */
function glitch(el) {
  if (reduceMotion) return;
  el.classList.remove('is-glitching');
  void el.offsetWidth;
  el.classList.add('is-glitching');
  setTimeout(() => el.classList.remove('is-glitching'), 400);
}
$$('.nav-logo, .footer-logo').forEach(el => {
  el.classList.add('glitch');
  el.setAttribute('data-text', el.textContent.trim());
  el.addEventListener('mouseenter', () => glitch(el));
});
const navLogo = $('.nav-logo');
if (navLogo && !reduceMotion) {
  (function loop() {
    setTimeout(() => { glitch(navLogo); loop(); }, 5000 + Math.random() * 4000);
  })();
}

/* =====================
   RULER + COORDINATES (desktop design-tool chrome)
   ===================== */
const wideDesk = finePointer && window.matchMedia('(min-width: 1100px)').matches && !reduceMotion;
let ruler = null, rulerMark = null, rulerVal = null, rulerMouse = null, coords = null;
if (wideDesk) {
  ruler = document.createElement('div');
  ruler.className = 'ruler';
  ruler.setAttribute('aria-hidden', 'true');
  ruler.innerHTML = '<div class="ruler-mouse"></div><div class="ruler-mark"><span class="ruler-val">Y 0</span></div>';
  rulerMark  = $('.ruler-mark', ruler);
  rulerVal   = $('.ruler-val', ruler);
  rulerMouse = $('.ruler-mouse', ruler);
  coords = document.createElement('div');
  coords.className = 'coords';
  coords.setAttribute('aria-hidden', 'true');
  document.body.append(ruler, coords);

  const pad4 = n => String(Math.max(0, Math.round(n))).padStart(4, '0');
  const setCoords = (x, y) => {
    coords.innerHTML = `X <b>${pad4(x)}</b> &nbsp;Y <b>${pad4(y)}</b> &nbsp;${window.innerWidth}×${window.innerHeight}`;
  };
  setCoords(0, 0);
  window.addEventListener('mousemove', e => {
    rulerMouse.style.transform = `translateY(${e.clientY}px)`;
    setCoords(e.pageX, e.pageY);
  }, { passive: true });
}

/* =====================
   SELECTION FRAME — hover any component, it gets selected like in Figma
   ===================== */
let selCurrent = null;
let placeSel = null;
if (finePointer && !reduceMotion) {
  const sel = document.createElement('div');
  sel.className = 'sel';
  sel.setAttribute('aria-hidden', 'true');
  sel.innerHTML = '<i></i><i></i><i></i><i></i><span class="sel-tag"></span><span class="sel-dim"></span>';
  document.body.appendChild(sel);
  const tag = $('.sel-tag', sel);
  const dim = $('.sel-dim', sel);

  const TARGETS = '.step, .offer-card, .price-block, .compare-wrap, .client-tag, .honesty-item, .btn, .contact-email-link, .copy-btn, .spec-cell, .polarity-btn';
  const clean = s => s.replace(/\s+/g, ' ').trim();
  const nameOf = el => {
    if (el.matches('.step'))               return `Frame / ${clean($('.step-title', el).textContent)}`;
    if (el.matches('.offer-card'))         return `Card / ${el.matches('.included') ? 'Inclus' : 'Exclus'}`;
    if (el.matches('.price-block'))        return 'Component / Prix';
    if (el.matches('.compare-wrap'))       return 'Table / Comparatif';
    if (el.matches('.client-tag'))         return `Tag / ${clean(el.textContent)}`;
    if (el.matches('.honesty-item'))       return `Item / ${clean($('strong', el).textContent)}`;
    if (el.matches('.contact-email-link')) return 'Link / Email';
    if (el.matches('.copy-btn'))           return 'Button / Copier';
    if (el.matches('.spec-cell'))          return `Cell / ${clean($('.spec-label', el).textContent)}`;
    if (el.matches('.polarity-btn'))       return 'Toggle / Mode';
    return `Button / ${clean(el.getAttribute('data-label') || el.textContent)}`;
  };

  placeSel = (el, snap) => {
    const r = el.getBoundingClientRect();
    const pad = 6;
    sel.classList.toggle('snap', snap);
    sel.style.transform = `translate(${r.left + window.scrollX - pad}px, ${r.top + window.scrollY - pad}px)`;
    sel.style.width  = `${r.width + pad * 2}px`;
    sel.style.height = `${r.height + pad * 2}px`;
    dim.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
  };

  document.addEventListener('mouseover', e => {
    const t = e.target.closest(TARGETS);
    const target = t && !t.closest('.nav') ? t : null;
    if (target === selCurrent) return;
    if (!target) { sel.classList.remove('on'); selCurrent = null; return; }
    const wasOff = !sel.classList.contains('on');
    tag.textContent = nameOf(target);
    placeSel(target, wasOff);
    selCurrent = target;
    sel.classList.add('on');
  });
  document.addEventListener('mouseleave', () => { sel.classList.remove('on'); selCurrent = null; });
}

/* =====================
   SCROLL LOOP — nav hide/show, ruler marker, keep selection glued
   ===================== */
let lastY = window.scrollY;
let navAnchorY = window.scrollY;
function scrollLoop() {
  const y = window.scrollY;
  const vel = y - lastY;
  lastY = y;

  if (nav) {
    nav.classList.toggle('scrolled', y > 12);
    const menuOpen = mobileMenu && mobileMenu.classList.contains('open');
    if (y < 160 || menuOpen)            { nav.classList.remove('nav-hidden'); navAnchorY = y; }
    else if (y - navAnchorY > 40)       { nav.classList.add('nav-hidden');    navAnchorY = y; }
    else if (navAnchorY - y > 40)       { nav.classList.remove('nav-hidden'); navAnchorY = y; }
    else if ((vel > 0 && y < navAnchorY) || (vel < 0 && y > navAnchorY)) navAnchorY = y;
  }

  if (rulerMark) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? y / max : 0;
    rulerMark.style.transform = `translateY(${Math.max(12, Math.min(window.innerHeight - 12, p * window.innerHeight))}px)`;
    rulerVal.textContent = `Y ${Math.round(y)}`;
  }

  if (vel !== 0 && selCurrent && placeSel) placeSel(selCurrent, true);
  requestAnimationFrame(scrollLoop);
}
requestAnimationFrame(scrollLoop);

/* =====================
   HERO — skeleton → code typed → compiled into the real headline
   ===================== */
const hero      = $('.hero');
const heroTitle = $('.hero-headline .h-display');
const heroCode  = $('.hero-code');

function buildHeroInstantly() {
  if (!hero) return;
  hero.classList.add('built-top', 'built-sub', 'built-actions');
  if (heroTitle) heroTitle.classList.add('is-built');
  if (heroCode) heroCode.classList.add('is-done');
}

if (hero && heroTitle && heroCode && !reduceMotion) {
  const out = $('.hc-text', heroCode);
  const segments = [
    ['tag', '<h1'], ['attr', ' class="hero"'], ['tag', '>'],
    ['', 'Votre site web,'], ['tag', '<br>'],
    ['', 'livré en 3 jours.'], ['tag', '</h1>'],
  ];
  let si = 0, ci = 0, span = null;

  const finish = () => {
    setTimeout(() => {
      heroCode.classList.add('is-done');
      heroTitle.classList.add('is-built', 'is-glitch');
      setTimeout(() => heroTitle.classList.remove('is-glitch'), 420);
      setTimeout(() => hero.classList.add('built-sub'), 380);
      setTimeout(() => hero.classList.add('built-actions'), 680);
    }, 260);
  };

  const type = () => {
    if (si >= segments.length) return finish();
    const [cls, text] = segments[si];
    if (ci === 0) {
      span = document.createElement('span');
      if (cls) span.className = cls;
      out.appendChild(span);
    }
    span.textContent += text[ci++];
    if (ci >= text.length) { si++; ci = 0; }
    setTimeout(type, cls ? 9 : 17 + Math.random() * 16);
  };

  const start = enteredViaTransition ? 520 : 200;
  setTimeout(() => hero.classList.add('built-top'), start);
  setTimeout(type, start + 220);
} else {
  buildHeroInstantly();
}

// Crosshair + live coordinates over the hero grid
if (hero && finePointer && !reduceMotion) {
  const cross = $('.crosshair', hero);
  const label = cross && $('.ch-label', cross);
  if (cross) {
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      cross.style.setProperty('--cx', `${x}px`);
      cross.style.setProperty('--cy', `${y}px`);
      label.textContent = `${Math.round(x)}, ${Math.round(y)}`;
      hero.classList.add('is-aim');
    });
    hero.addEventListener('mouseleave', () => hero.classList.remove('is-aim'));
  }
}

const polarityBtn = $('.polarity-btn');
if (polarityBtn && hero) {
  polarityBtn.addEventListener('click', () => {
    hero.classList.toggle('inverted');
    $('span', polarityBtn).textContent = hero.classList.contains('inverted') ? 'Mode clair' : 'Mode contraste';
  });
}

/* =====================
   HEADINGS — block wipe
   ===================== */
const wipes = [];
if (!reduceMotion) {
  $$('main h2, .page-hero h1, .contact-simple h1').forEach(h => {
    if (h.closest('.cta-final')) return;
    const w = document.createElement('span');
    w.className = 'wipe';
    while (h.firstChild) w.appendChild(h.firstChild);
    h.appendChild(w);
    wipes.push(w);
  });
}

/* =====================
   SERVICES — odometer price + struck "not included" items
   ===================== */
const odoCols = [];
$$('[data-odometer]').forEach(el => {
  if (reduceMotion) return;
  const text = el.textContent.trim();
  el.textContent = '';
  [...text].forEach((ch, i) => {
    if (!/\d/.test(ch)) { el.appendChild(document.createTextNode(ch)); return; }
    const odo = document.createElement('span');
    odo.className = 'odo';
    odo.setAttribute('aria-hidden', 'true');
    const col = document.createElement('span');
    col.className = 'odo-col';
    for (let n = 0; n < 20; n++) {
      const d = document.createElement('span');
      d.textContent = n % 10;
      col.appendChild(d);
    }
    col.dataset.target = 10 + Number(ch);
    col.style.setProperty('--d', `${i * 140}ms`);
    odo.appendChild(col);
    el.appendChild(odo);
    odoCols.push({ el, col });
  });
});

$$('.offer-card.excluded li').forEach(li => {
  const t = document.createElement('span');
  t.className = 't';
  while (li.firstChild) t.appendChild(li.firstChild);
  li.appendChild(t);
});

/* =====================
   SCROLL REVEAL (IntersectionObserver)
   ===================== */
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.classList.contains('wipe')) el.classList.add('in-view');
      else el.classList.add('visible');
      if (el.hasAttribute('data-odometer')) {
        odoCols.filter(o => o.el === el).forEach(({ col }) => {
          col.style.transform = `translateY(-${col.dataset.target}em)`;
        });
      }
      revealObserver.unobserve(el);
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
);
[...$$('.reveal'), ...wipes, ...$$('[data-odometer]')].forEach(el => revealObserver.observe(el));

/* =====================
   COMPARE — strike the agency, stamp our answer (price counts down)
   ===================== */
const table = $('.compare-table');
if (table) {
  const rows = $$('tbody tr', table);
  let priceStamp = null;
  rows.forEach((row, i) => {
    const [, agency, ours] = row.cells;
    if (agency.textContent.trim() !== ours.textContent.trim()) {
      const s = document.createElement('span');
      s.className = 'strike';
      while (agency.firstChild) s.appendChild(agency.firstChild);
      agency.appendChild(s);
    }
    const stamp = document.createElement('span');
    stamp.className = 'stamp';
    while (ours.firstChild) stamp.appendChild(ours.firstChild);
    ours.appendChild(stamp);
    if (i === 0 && /500/.test(stamp.textContent)) priceStamp = stamp;
  });

  const priceCountdown = () => {
    if (!priceStamp || reduceMotion) return;
    const from = 15000, to = 500, dur = 1100;
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      priceStamp.textContent = `${Math.round(from + (to - from) * eased).toLocaleString('fr-FR')} €`;
      if (p < 1) requestAnimationFrame(step);
    };
    priceStamp.textContent = `${from.toLocaleString('fr-FR')} €`;
    setTimeout(() => requestAnimationFrame(step), 700);
  };

  const tableObserver = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    rows.forEach((row, i) => setTimeout(() => row.classList.add('visible'), i * 110));
    priceCountdown();
    tableObserver.disconnect();
  }, { threshold: 0.25 });
  tableObserver.observe(table);
}

/* =====================
   STEPS — 72h countdown to delivery (pinned scrollytelling on desktop)
   ===================== */
const stepsSection = $('.steps-section');
if (stepsSection) {
  const cdWrap = $('.countdown', stepsSection);
  const cdTime = $('.cd-time', stepsSection);
  const bar    = $('.steps-progress span', stepsSection);
  const steps  = $$('.step', stepsSection);
  const TOTAL  = 72 * 3600;
  const pad2 = n => String(n).padStart(2, '0');

  const setProgress = p => {
    const done = p >= 0.995;
    if (cdTime) {
      if (done) cdTime.textContent = 'LIVRÉ';
      else {
        const left = Math.round(TOTAL * (1 - p));
        cdTime.textContent = `${pad2(Math.floor(left / 3600))}:${pad2(Math.floor(left % 3600 / 60))}:${pad2(left % 60)}`;
      }
    }
    if (cdWrap) cdWrap.classList.toggle('is-done', done);
    if (bar) bar.style.transform = `scaleX(${p})`;
    const idx = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx && p > 0.02);
      s.classList.toggle('is-done', i < idx || done);
    });
  };

  const canPin = hasGsap && window.matchMedia('(min-width: 900px) and (min-height: 640px)').matches;
  if (reduceMotion) {
    setProgress(1);
  } else if (canPin) {
    stepsSection.classList.add('is-pinned');
    ScrollTrigger.create({
      trigger: stepsSection,
      start: 'top top',
      end: '+=180%',
      pin: true,
      scrub: true,
      onUpdate: self => setProgress(self.progress),
    });
  } else {
    // mobile: the clock runs down on its own once the steps are on screen
    const grid = $('.steps-grid', stepsSection);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const dur = 3600, start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / dur);
        setProgress(p);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    if (grid) io.observe(grid);
  }
}

/* =====================
   CTA — wireframe gets rendered by a scanline
   ===================== */
const cta = $('.cta-final');
if (cta && !reduceMotion) {
  cta.classList.add('wire');
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    cta.style.setProperty('--h', `${cta.offsetHeight}px`);
    setTimeout(() => {
      cta.classList.add('rendering');
      setTimeout(() => cta.classList.remove('wire', 'rendering'), 1150);
    }, 550);
  }, { threshold: 0.45 });
  io.observe(cta);
}

/* =====================
   CONTACT — email typed out + copy button
   ===================== */
const emailLink = $('.contact-email-link');
if (emailLink && !reduceMotion) {
  const text = emailLink.textContent.trim();
  emailLink.setAttribute('aria-label', text);
  emailLink.textContent = '';
  const typed = document.createTextNode('');
  const caret = document.createElement('span');
  caret.className = 'tcaret';
  caret.setAttribute('aria-hidden', 'true');
  emailLink.append(typed, caret);
  emailLink.classList.add('is-typing');
  let i = 0;
  const tick = () => {
    typed.data = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, 26 + Math.random() * 38);
    else {
      emailLink.classList.remove('is-typing');
      emailLink.classList.add('is-typed');
      setTimeout(() => caret.remove(), 1800);
    }
  };
  setTimeout(tick, enteredViaTransition ? 650 : 380);
}

const copyBtn = $('.copy-btn');
if (copyBtn) {
  const label = $('.copy-label', copyBtn);
  const original = label.textContent;
  copyBtn.addEventListener('click', () => {
    const done = msg => {
      label.textContent = msg;
      copyBtn.classList.add('is-copied');
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(() => {
        label.textContent = original;
        copyBtn.classList.remove('is-copied');
      }, 2200);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyBtn.dataset.copy)
        .then(() => done('Adresse copiée'))
        .catch(() => { label.textContent = copyBtn.dataset.copy; });
    } else {
      label.textContent = copyBtn.dataset.copy;
    }
  });
}

/* =====================
   Fonts shift layout a little — re-measure pinned scenes once loaded
   ===================== */
if (hasGsap) window.addEventListener('load', () => ScrollTrigger.refresh());
