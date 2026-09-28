/* =====================
   ENV
   ===================== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGsap      = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;
const enteredViaTransition = document.documentElement.classList.contains('nr-enter');

if (!hasGsap) document.documentElement.classList.add('no-gsap');
if (hasGsap) gsap.registerPlugin(ScrollTrigger);

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
   REVEAL HOOK — everything that waits for the page to be shown
   ===================== */
const onRevealed = [];
function reveal() {
  document.body.classList.add('revealed');
  if (lenis) lenis.start();
  onRevealed.forEach(fn => fn());
  if (hasGsap) ScrollTrigger.refresh();
}

/* =====================
   LOADER (index only — other pages reveal instantly)
   ===================== */
const loader = document.querySelector('.loader');
if (loader && !enteredViaTransition && !reduceMotion) {
  if (lenis) lenis.stop();
  const fill  = loader.querySelector('.loader-fill');
  const count = loader.querySelector('.loader-count');
  let n = 0;
  fill.classList.add('sweep');
  const tick = setInterval(() => {
    n = Math.min(100, n + Math.round(4 + Math.random() * 10));
    count.textContent = n + '%';
    if (n >= 100) {
      clearInterval(tick);
      setTimeout(() => {
        loader.setAttribute('data-done', '');
        reveal();
        setTimeout(() => loader.remove(), 800);
      }, 150);
    }
  }, 90);
} else {
  if (loader) loader.remove();
  // runs once this whole file has registered its onRevealed hooks
  queueMicrotask(reveal);
}

/* =====================
   PAGE TRANSITIONS (blue curtain)
   ===================== */
const curtain = document.createElement('div');
curtain.className = 'curtain';
curtain.setAttribute('aria-hidden', 'true');
curtain.innerHTML = '<span>notreal.corp</span>';
document.body.appendChild(curtain);

if (enteredViaTransition) {
  curtain.className = 'curtain is-cover';
  document.documentElement.classList.remove('nr-enter');
  requestAnimationFrame(() => {
    setTimeout(() => {
      curtain.className = 'curtain is-out';
      setTimeout(() => { curtain.className = 'curtain'; }, 800);
    }, 120);
  });
}

document.addEventListener('click', e => {
  if (reduceMotion || e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
  if (a.origin !== location.origin) return;
  if (a.pathname === location.pathname) return;

  e.preventDefault();
  try { sessionStorage.setItem('nr-nav', '1'); } catch (_) {}
  curtain.className = 'curtain is-in';
  setTimeout(() => { location.href = a.href; }, 640);
});

// back/forward cache: never come back to a covered page
window.addEventListener('pageshow', e => {
  if (e.persisted) {
    curtain.className = 'curtain';
    document.documentElement.classList.remove('nr-enter');
  }
});

/* =====================
   BUTTON SWIPE LABEL (mirrors visible text into data-label for ::before)
   ===================== */
document.querySelectorAll('.btn').forEach(btn => {
  btn.setAttribute('data-label', btn.textContent.trim());
});

/* =====================
   NAV — mobile toggle
   ===================== */
const nav        = document.querySelector('.nav');
const hamburger  = document.querySelector('.nav-hamburger');
const mobileMenu = document.querySelector('.nav-mobile');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* =====================
   NAV — active link
   ===================== */
const currentFile = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentFile || (currentFile === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

/* =====================
   SCROLL LOOP — progress bar, nav hide/show, scroll velocity
   ===================== */
const progress = document.createElement('div');
progress.className = 'scroll-progress';
progress.setAttribute('aria-hidden', 'true');
document.body.appendChild(progress);

let scrollVel = 0;
let lastY = window.scrollY;
let navAnchorY = window.scrollY;

function scrollLoop() {
  const y = window.scrollY;
  scrollVel = y - lastY;
  lastY = y;

  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  if (nav) {
    nav.classList.toggle('scrolled', y > 12);
    const menuOpen = mobileMenu && mobileMenu.classList.contains('open');
    if (y < 160 || menuOpen) {
      nav.classList.remove('nav-hidden');
      navAnchorY = y;
    } else if (y - navAnchorY > 40) {
      nav.classList.add('nav-hidden');
      navAnchorY = y;
    } else if (navAnchorY - y > 40) {
      nav.classList.remove('nav-hidden');
      navAnchorY = y;
    } else if ((scrollVel > 0 && y < navAnchorY) || (scrollVel < 0 && y > navAnchorY)) {
      navAnchorY = y;
    }
  }
  requestAnimationFrame(scrollLoop);
}
requestAnimationFrame(scrollLoop);

/* =====================
   CUSTOM CURSOR (desktop only)
   ===================== */
if (finePointer && !reduceMotion) {
  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  ring.innerHTML = '<i></i>';
  document.body.append(dot, ring);
  document.body.classList.add('has-cursor', 'cursor-hidden');

  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    document.body.classList.remove('cursor-hidden');
  }, { passive: true });
  document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
  window.addEventListener('mousedown', () => document.body.classList.add('cursor-down'));
  window.addEventListener('mouseup',   () => document.body.classList.remove('cursor-down'));

  document.addEventListener('mouseover', e => {
    const link = e.target.closest('a, button, .magnetic');
    const card = !link && e.target.closest('.step, .offer-card, .client-tag, .price-block, .compare-table tbody tr');
    document.body.classList.toggle('cursor-link', !!link);
    document.body.classList.toggle('cursor-card', !!card);
  });

  const cursorLoop = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dot.style.transform  = `translate3d(${mx}px, ${my}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(cursorLoop);
  };
  requestAnimationFrame(cursorLoop);
}

/* =====================
   TEXT SCRAMBLE (mono labels)
   ===================== */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+';
function scramble(el, duration = 600) {
  if (reduceMotion) return;
  const final = el.dataset.text || (el.dataset.text = el.textContent);
  const start = performance.now();
  cancelAnimationFrame(el._scr);
  const step = now => {
    const p = Math.min(1, (now - start) / duration);
    const settled = Math.floor(final.length * p);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const c = final[i];
      out += (i < settled || c === ' ') ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scr = requestAnimationFrame(step);
  };
  el._scr = requestAnimationFrame(step);
}

document.querySelectorAll('.nav-links a:not(.btn)').forEach(a => {
  a.addEventListener('mouseenter', () => scramble(a, 420));
});
onRevealed.push(() => {
  document.querySelectorAll('.spec-value').forEach((el, i) => {
    setTimeout(() => scramble(el, 700), 200 + i * 120);
  });
});

/* =====================
   HERO — per-character headline + spotlight grid + polarity
   ===================== */
const hero = document.querySelector('.hero');
const heroTitle = document.querySelector('.hero-headline .h-display');

if (heroTitle && !reduceMotion) {
  let i = 0;
  heroTitle.querySelectorAll('.line > span').forEach(lineSpan => {
    const words = lineSpan.textContent.trim().split(/\s+/);
    lineSpan.textContent = '';
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'wd';
      [...word].forEach(ch => {
        const c = document.createElement('span');
        c.className = 'ch';
        c.textContent = ch;
        c.style.setProperty('--i', i++);
        w.appendChild(c);
      });
      lineSpan.appendChild(w);
      if (wi < words.length - 1) lineSpan.appendChild(document.createTextNode(' '));
    });
  });
  heroTitle.classList.add('is-split');
}

if (hero && finePointer && !reduceMotion) {
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
    hero.classList.add('is-lit');
  });
  hero.addEventListener('mouseleave', () => hero.classList.remove('is-lit'));
}

const polarityBtn = document.querySelector('.polarity-btn');
if (polarityBtn && hero) {
  polarityBtn.addEventListener('click', () => {
    hero.classList.toggle('inverted');
    const label = polarityBtn.querySelector('span');
    label.textContent = hero.classList.contains('inverted') ? 'Mode clair' : 'Mode contraste';
    delete label.dataset.text;
    scramble(label, 380);
  });
}

/* =====================
   MAGNETIC BUTTONS
   ===================== */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.magnetic').forEach(el => {
    const strength = 22;
    const settle = 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transition = settle;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transition = 'transform 120ms linear';
      el.style.transform = `translate(${(x / r.width) * strength}px, ${(y / r.height) * strength}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = settle;
      el.style.transform = '';
    });
  });
}

/* =====================
   TILT (price block)
   ===================== */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting');
      el.style.transform = `perspective(900px) rotateX(${-py * 7}deg) rotateY(${px * 9}deg) translate(-6px, -6px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('is-tilting');
      el.style.transform = '';
    });
  });
}

/* =====================
   SPLIT HEADINGS (h2 word mask reveal)
   ===================== */
if (!reduceMotion) {
  document.querySelectorAll('main h2').forEach(h => {
    const label = h.textContent.trim();
    const words = label.split(/\s+/);
    h.setAttribute('aria-label', label);
    h.textContent = '';
    words.forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.textContent = word;
      inner.style.setProperty('--i', i);
      w.appendChild(inner);
      h.appendChild(w);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    h.classList.add('split-words');
  });
}

/* =====================
   CONTACT — email character wave
   ===================== */
const emailLink = document.querySelector('.contact-email-link');
if (emailLink && !reduceMotion) {
  const text = emailLink.textContent.trim();
  emailLink.setAttribute('aria-label', text);
  emailLink.textContent = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ec';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch;
    s.style.setProperty('--i', i);
    emailLink.appendChild(s);
  });
}

/* =====================
   COUNT-UP
   ===================== */
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const dur = 1400;
  const start = performance.now();
  const step = now => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* =====================
   SCROLL REVEAL (IntersectionObserver)
   ===================== */
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add(el.classList.contains('split-words') ? 'in-view' : 'visible');
      if (el.dataset.count && !reduceMotion) countUp(el);
      revealObserver.unobserve(el);
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
);

onRevealed.push(() => {
  document.querySelectorAll('.reveal, .split-words, [data-count]').forEach(el => revealObserver.observe(el));
});

/* =====================
   TABLE ROW STAGGER
   ===================== */
const tableRows = document.querySelectorAll('.compare-table tbody tr');
const table = document.querySelector('.compare-table');
if (tableRows.length && table) {
  const tableObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tableRows.forEach((row, i) => {
            setTimeout(() => row.classList.add('visible'), i * 90);
          });
          tableObserver.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  tableObserver.observe(table);
}

/* =====================
   MARQUEE — infinite, reacts to scroll speed & direction
   ===================== */
document.querySelectorAll('.marquee').forEach(marquee => {
  const track = marquee.querySelector('.marquee-track');
  const group = track && track.querySelector('.marquee-group');
  if (!group) return;

  const fill = () => {
    while (track.children.length > 1) track.lastElementChild.remove();
    const copies = Math.max(2, Math.ceil((window.innerWidth * 2) / group.offsetWidth) + 1);
    for (let i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));
  };
  fill();
  if (reduceMotion) return;

  let groupW = group.offsetWidth;
  let x = 0, dir = 1, skew = 0, visible = false;
  window.addEventListener('resize', () => { fill(); groupW = group.offsetWidth; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(marquee);

  const loop = () => {
    if (visible) {
      if (scrollVel > 0.5) dir = 1;
      else if (scrollVel < -0.5) dir = -1;
      const speed = (0.9 + Math.min(Math.abs(scrollVel) * 0.35, 14)) * dir;
      x -= speed;
      if (x <= -groupW) x += groupW;
      if (x > 0) x -= groupW;
      const targetSkew = Math.max(-10, Math.min(10, -scrollVel * 0.5));
      skew += (targetSkew - skew) * 0.12;
      track.style.transform = `translate3d(${x}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

/* =====================
   GSAP SCROLL-DRIVEN SCENES
   ===================== */
if (hasGsap) {
  // Hero parallax: headline drifts up and fades, grid sinks
  if (hero) {
    gsap.to('.hero-headline', {
      yPercent: -22, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero-grid-lines, .hero-grid-glow', {
      y: 120, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // Steps progress bar fills as you read through the process
  const stepsBar = document.querySelector('.steps-progress span');
  if (stepsBar) {
    gsap.fromTo(stepsBar, { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.steps-grid', start: 'top 85%', end: 'bottom 55%', scrub: 0.6 }
    });
  }

  // CTA: huge outlined word slides across, lead text lights up word by word
  const cta = document.querySelector('.cta-final');
  if (cta) {
    const bgWord = cta.querySelector('.cta-bg-word');
    if (bgWord) {
      gsap.fromTo(bgWord, { xPercent: 12 }, {
        xPercent: -38, ease: 'none',
        scrollTrigger: { trigger: cta, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
    const lead = cta.querySelector('.cta-lead');
    if (lead) {
      const text = lead.textContent.trim();
      lead.setAttribute('aria-label', text);
      lead.textContent = '';
      text.split(/\s+/).forEach((word, i, all) => {
        const s = document.createElement('span');
        s.className = 'sw';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = word;
        lead.appendChild(s);
        if (i < all.length - 1) lead.appendChild(document.createTextNode(' '));
      });
      gsap.fromTo(lead.querySelectorAll('.sw'), { opacity: 0.18 }, {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: lead, start: 'top 85%', end: 'top 45%', scrub: true }
      });
    }
  }

  // Services price: letters tighten as it scrolls into place
  const price = document.querySelector('.price-amount');
  if (price) {
    gsap.fromTo(price, { letterSpacing: '0.08em' }, {
      letterSpacing: '-0.02em', ease: 'none',
      scrollTrigger: { trigger: price, start: 'top 95%', end: 'top 55%', scrub: 0.6 }
    });
  }
}
