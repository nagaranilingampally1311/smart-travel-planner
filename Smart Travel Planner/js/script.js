// Smart Travel Planner - Interactivity

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Mobile nav toggle
  const navToggle = $('.nav-toggle');
  const navLinks = $('#primary-nav');
  if (navToggle && navLinks) {
    const closeOnNavigate = (e) => {
      if (e.target.tagName === 'A') {
        navLinks.classList.add('hidden');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    };
    navToggle.addEventListener('click', () => {
      const isOpen = !navLinks.classList.contains('hidden');
      navLinks.classList.toggle('hidden');
      navToggle.setAttribute('aria-expanded', String(!isOpen));
    });
    navLinks.addEventListener('click', closeOnNavigate);
  }

  // Ensure nav visibility matches viewport (desktop shows, mobile hidden by default)
  const syncNavVisibility = () => {
    const isMobile = window.matchMedia('(max-width: 880px)').matches;
    if (isMobile) {
      navLinks && navLinks.classList.add('hidden');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
    } else {
      navLinks && navLinks.classList.remove('hidden');
      navToggle && navToggle.setAttribute('aria-expanded', 'true');
    }
  };
  // Run once and on resize
  syncNavVisibility();
  window.addEventListener('resize', syncNavVisibility);

  // Dropdowns (toggle on click for accessibility + mobile)
  $$('.dropdown > .dropdown-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.dropdown');
      const opened = parent.classList.contains('open');
      // close others
      $$('.dropdown.open').forEach(d => d !== parent && d.classList.remove('open'));
      parent.classList.toggle('open', !opened);
    });
  });
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      $$('.dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });

  // Suppress browser URL preview for navbar navigation by handling clicks via JS
  // Applies only to header nav links to keep external/gallery links normal
  $$('.site-header .nav-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    // store and remove href so the browser doesn't show the URL tooltip
    link.dataset.href = href;
    link.removeAttribute('href');
    link.setAttribute('role', 'link');
    link.setAttribute('tabindex', '0');
    const navigate = () => { window.location.assign(link.dataset.href); };
    link.addEventListener('click', (e) => { e.preventDefault(); navigate(); });
    link.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); } });
  });

  // Footer year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Smooth scroll for internal anchors
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = $(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Planner form logic (simple client-side suggestions)
  const form = $('#planner-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const destination = ($('#destination')?.value || '').trim();
      const startStr = ($('#start')?.value || '').trim();
      const endStr = ($('#end')?.value || '').trim();
      const totalBudget = Math.max(0, Number(($('#budget')?.value || '0').replace(/,/g, '')));
      const interestEls = $$('#planner-form input[name="interests"]:checked');
      const interests = interestEls.map(i => i.value);

      if (!destination || !startStr || !endStr) {
        alert('Please provide a destination and valid start/end dates.');
        return;
      }

      const start = new Date(startStr);
      const end = new Date(endStr);
      if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime()) || end < start) {
        alert('Please ensure dates are valid and the end is after the start.');
        return;
      }

      const msPerDay = 1000 * 60 * 60 * 24;
      const tripDays = Math.max(1, Math.round((end - start) / msPerDay) + 1);

      const formatINR = (n) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
      const focusText = interests.length ? interests.join(' and ') : 'Sightseeing';

      const results = $('#results');
      const cards = $('#summary-cards');
      const itineraryCard = $('#itinerary-card');

      // Summary cards
      cards.innerHTML = `
        <article class="card"><div class="icon">📅</div><h3>Duration</h3><p class="muted">${tripDays} day${tripDays > 1 ? 's' : ''}</p></article>
        <article class="card"><div class="icon">🎯</div><h3>Focus</h3><p class="muted">${focusText}</p></article>
        <article class="card"><div class="icon">💵</div><h3>Budget</h3><p class="muted">${formatINR(totalBudget)} total</p></article>
      `;

      // Build day-by-day suggestions from chosen interests
      const pool = [];
      const add = (arr) => arr.forEach((x) => pool.push(x));
      if (interests.includes('Adventure')) add(['Hiking trail', 'Kayak/rafting', 'Zipline park']);
      if (interests.includes('Beaches')) add(['Beach day', 'Snorkeling', 'Sunset by the shore']);
      if (interests.includes('Mountains')) add(['Scenic hike', 'Viewpoint sunrise', 'Cable car ride']);
      if (interests.includes('City')) add(['Old town walk', 'Museum & gallery', 'Street food tour']);
      if (pool.length === 0) add(['City highlights', 'Local cuisine', 'Nature walk']);

      const items = [];
      for (let i = 0; i < tripDays; i++) {
        const d = new Date(start.getTime() + i * msPerDay);
        const idea = pool[i % pool.length];
        items.push(`<li><strong>Day ${i + 1}</strong> (${d.toLocaleDateString()}): ${idea}</li>`);
      }

      // Simple budget breakdown
      const baseSplit = { lodging: 0.4, transport: 0.25, food: 0.2, activities: 0.15 };
      const activitiesBoost = interests.includes('Adventure') ? 0.05 : 0;
      const split = { ...baseSplit, activities: baseSplit.activities + activitiesBoost, food: baseSplit.food - activitiesBoost };
      const breakdown = Object.entries(split)
        .map(([k, v]) => `<li>${k[0].toUpperCase() + k.slice(1)}: <strong>${formatINR(totalBudget * v)}</strong></li>`)
        .join('');

      itineraryCard.innerHTML = `
        <h3 style="margin-top:0;">Your trip to ${destination}</h3>
        <p class="muted" style="margin-bottom:10px;">A simple plan balancing your interests.</p>
        <ul style="margin: 0 0 12px 18px;">${items.join('')}</ul>
        <h4 style="margin:12px 0 8px;">Budget breakdown</h4>
        <ul style="margin: 0 0 4px 18px;">${breakdown}</ul>
      `;

      results.classList.remove('hidden');
      itineraryCard.classList.remove('fade-in');
      void itineraryCard.offsetWidth;
      itineraryCard.classList.add('fade-in');
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });

      form.reset();
    });
  }

  // Dynamic Inspiration Gallery
  const galleryEl = $('#gallery-cards');
  if (galleryEl) {
    const render = (items) => {
      if (!Array.isArray(items) || items.length === 0) throw new Error('No items');
      galleryEl.innerHTML = items.map((it) => {
        const isAd = it.type === 'ad';
        const badge = it.type === 'news' ? '<span class="badge badge-news">News</span>' : (isAd ? '<span class="badge badge-ad">Ad</span>' : '');
        const target = it.url ? ' target="_blank" rel="noopener"' : '';
        return `
          <a class="card ${isAd ? 'ad-card' : ''}" href="${it.url || '#'}"${target} style="padding:0; overflow:hidden;">
            <img src="${it.image}" alt="${it.alt || it.title}" style="width:100%; height:220px; object-fit:cover;" />
            <div style="padding:12px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <div>
                <strong>${it.title}</strong>
                <p class="muted" style="margin:4px 0 0; font-size:13px;">${it.subtitle || ''}</p>
              </div>
              ${badge}
            </div>
          </a>
        `;
      }).join('');
    };

    fetch('data/gallery.json')
      .then((r) => r.json())
      .then(render)
      .catch(() => {
        // Fallback to embedded JSON in the page
        try {
          const inline = document.getElementById('gallery-data');
          if (inline) {
            const items = JSON.parse(inline.textContent || '[]');
            render(items);
            return;
          }
        } catch {}
        galleryEl.innerHTML = '<div class="card"><div class="icon">⚠️</div><strong>Could not load inspiration.</strong><p class="muted">Please refresh or try again later.</p></div>';
      });
  }
})();


