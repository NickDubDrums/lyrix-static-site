async function loadPartials() {
  const header = document.querySelector('#__header');
  const footer = document.querySelector('#__footer');

  // Load header/footer HTML
  try {
    if (header) {
      const h = await fetch('partials/header.html', { cache: 'no-cache' });
      header.innerHTML = await h.text();
    }
    if (footer) {
      const f = await fetch('partials/footer.html', { cache: 'no-cache' });
      footer.innerHTML = await f.text();
      const yearSpan = document.getElementById('year');
      if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }
  } catch (e) {
    console.error('Partials load error', e);
  }

  // After header is in the DOM, wire up mobile drawer
  setupMobileNav();
  // Setup scroll reveal animations
  setupScrollReveal();

  document.dispatchEvent(new CustomEvent("partials:loaded")); 
}

function setupMobileNav() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-overlay');
  const burger = document.getElementById('hamburger');
  const closeBtn = document.getElementById('drawer-close');

  if (!drawer || !overlay || !burger) return;

  const open = () => {
    drawer.classList.add('open');
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    burger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    drawer.classList.remove('open');
    overlay.hidden = true;
    document.body.classList.remove('no-scroll');
    burger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
  };

  burger.addEventListener('click', () => {
    if (drawer.classList.contains('open')) close();
    else open();
  });
  overlay.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  // Close on nav click (mobile)
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

function setupScrollReveal() {
  // Marca automaticamente elementi tipici; puoi aggiungere manualmente data-reveal dove vuoi.
  document.querySelectorAll('.card, .hero h1, .hero p, .hero .buttons, .section h1, .section h2, .section p, [data-reveal]')
    .forEach(el => {
      // Se il blocco è media/tiles, usa reveal-scale per più presenza
      if (el.matches('.tile, .tile__media')) el.classList.add('reveal-scale');
      else el.classList.add('reveal');
    });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.add('visible');
      } else {
        // reverse on scroll-up: quando esce dal viewport rimuoviamo .visible
        el.classList.remove('visible');
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.reveal, .reveal-scale').forEach(el => io.observe(el));
}


document.addEventListener('DOMContentLoaded', loadPartials);



(() => {
  const R = 180; // raggio (px) entro cui il BORDO “sente” il mouse anche da fuori
  let raf = null;

  const $spots = () => document.querySelectorAll('.card.spotlight');

  const updateAll = (mx, my) => {
    $spots().forEach(el => {
      const rect = el.getBoundingClientRect();

      // punto più vicino al mouse CLAMPATO dentro il box
      const nx = Math.max(rect.left, Math.min(mx, rect.right));
      const ny = Math.max(rect.top,  Math.min(my, rect.bottom));

      // distanza mouse -> box (0 se dentro)
      const dx = mx < rect.left   ? rect.left - mx  : (mx > rect.right  ? mx - rect.right : 0);
      const dy = my < rect.top    ? rect.top  - my  : (my > rect.bottom ? my - rect.bottom: 0);
      const dist = Math.hypot(dx, dy);

      // coord locali per i gradient (in px dentro l’elemento)
      const lx = nx - rect.left;
      const ly = ny - rect.top;

      el.style.setProperty('--mx', lx + 'px');
      el.style.setProperty('--my', ly + 'px');

      // opacità del glow bordo in base alla distanza (fade fuori fino a R)
      const t = Math.max(0, 1 - dist / R);
      el.style.setProperty('--bop', t.toFixed(3));
    });
  };

  document.addEventListener('pointermove', (e) => {
    const { clientX: mx, clientY: my } = e;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => updateAll(mx, my));
  }, { passive: true });

  // quando il puntatore esce dalla finestra: spegni i bordi
  document.addEventListener('pointerleave', () => {
    $spots().forEach(el => el.style.setProperty('--bop', '0'));
  }, true);
})();

