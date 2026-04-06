/**
 * Walls SDK v1.0.0
 * Fetches and renders wallpapers from the Walls API.
 * Handles routing, search, filters, detail view, and deep links.
 */
(function (window) {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  const state = {
    page: 1,
    filter: 'all',       // all | recent | popular
    query: '',
    loading: false,
    done: false,         // no more pages
    wallpapers: [],
    current: null,       // open wallpaper detail
    route: '/',          // current route
  };

  // ─── Config (set by init) ─────────────────────────────────────────────────
  let cfg = {
    apiUrl: '',
    container: '#app',
  };

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  let $app, $grid, $loader, $detail, $searchInput, $filterBtns;

  // ─── Utils ────────────────────────────────────────────────────────────────
  const el = (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  // ─── API ──────────────────────────────────────────────────────────────────
  const api = {
    async get(path) {
      const res = await fetch(`${cfg.apiUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    },

    wallpapers({ page = 1, filter = 'all', query = '' } = {}) {
      const params = new URLSearchParams({ page, filter });
      if (query) params.set('q', query);
      return this.get(`/wallpapers?${params}`);
    },

    wallpaper(id) {
      return this.get(`/wallpapers/${id}`);
    },

    download(id) {
      return this.get(`/wallpapers/${id}/download`);
    },
  };

  // ─── Router ───────────────────────────────────────────────────────────────
  const router = {
    init() {
      window.addEventListener('popstate', () => this.resolve(location.pathname));
      this.resolve(location.pathname);
    },

    push(path) {
      history.pushState(null, '', path);
      this.resolve(path);
    },

    resolve(path) {
      state.route = path;
      const match = path.match(/^\/wallpaper\/(.+)$/);
      if (match) {
        views.detail(match[1]);
      } else if (path.startsWith('/search')) {
        const q = new URLSearchParams(location.search).get('q') || '';
        views.search(q);
      } else {
        views.home();
      }
    },
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const render = {
    card(w) {
      const card = el('div', 'wall-card');
      card.dataset.id = w.id;
      card.innerHTML = `
        <div class="wall-card__img-wrap">
          <img
            src="${w.thumbnail_url || w.image_url}"
            alt="${w.title}"
            loading="lazy"
            decoding="async"
          />
          <div class="wall-card__overlay">
            <button class="wall-card__btn" data-action="open" data-id="${w.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
            <button class="wall-card__btn" data-action="download" data-id="${w.id}" data-url="${w.image_url}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
        <div class="wall-card__meta">
          <span class="wall-card__title">${w.title || 'Untitled'}</span>
          ${w.author ? `<span class="wall-card__author">${w.author.name || ''}</span>` : ''}
        </div>
      `;
      return card;
    },

    detailView(w) {
      return `
        <div class="detail-backdrop" style="background-image:url('${w.image_url}')"></div>
        <div class="detail-panel">
          <button class="detail-close" id="detail-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="detail-img-wrap">
            <img src="${w.image_url}" alt="${w.title}" />
          </div>
          <div class="detail-info">
            <h2 class="detail-title">${w.title || 'Untitled'}</h2>
            ${w.author ? `
              <div class="detail-author">
                <img src="${w.author.avatar_url || ''}" class="detail-avatar" />
                <span>${w.author.name}</span>
              </div>` : ''}
            <div class="detail-stats">
              <span>${w.downloads || 0} downloads</span>
              <span>${w.likes || 0} likes</span>
              ${w.width ? `<span>${w.width}×${w.height}</span>` : ''}
            </div>
            ${w.tags?.length ? `
              <div class="detail-tags">
                ${w.tags.map(t => `<span class="detail-tag">${t}</span>`).join('')}
              </div>` : ''}
            <button class="detail-dl-btn" data-action="download" data-id="${w.id}" data-url="${w.image_url}">
              Download Wallpaper
            </button>
          </div>
        </div>
      `;
    },

    skeleton() {
      return Array.from({ length: 8 }, () =>
        `<div class="wall-skeleton"></div>`
      ).join('');
    },

    empty(msg = 'No wallpapers found') {
      return `<div class="wall-empty"><p>${msg}</p></div>`;
    },
  };

  // ─── Grid ─────────────────────────────────────────────────────────────────
  const grid = {
    reset() {
      state.page = 1;
      state.done = false;
      state.wallpapers = [];
      $grid.innerHTML = render.skeleton();
    },

    async load() {
      if (state.loading || state.done) return;
      state.loading = true;

      try {
        const data = await api.wallpapers({
          page: state.page,
          filter: state.filter,
          query: state.query,
        });

        const items = Array.isArray(data) ? data : data.wallpapers || [];

        if (state.page === 1) $grid.innerHTML = '';

        if (!items.length) {
          if (state.page === 1) $grid.innerHTML = render.empty();
          state.done = true;
          return;
        }

        items.forEach(w => {
          state.wallpapers.push(w);
          $grid.appendChild(render.card(w));
        });

        state.page++;
        if (items.length < 20) state.done = true;
      } catch (err) {
        console.error('[WallsSDK] fetch error', err);
        if (state.page === 1) $grid.innerHTML = render.empty('Failed to load. Check your connection.');
      } finally {
        state.loading = false;
        $loader.style.display = state.done ? 'none' : 'flex';
      }
    },
  };

  // ─── Infinite scroll ──────────────────────────────────────────────────────
  let observer;
  const setupInfiniteScroll = () => {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) grid.load();
    }, { rootMargin: '200px' });
    observer.observe($loader);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const actions = {
    async open(id) {
      router.push(`/wallpaper/${id}`);
    },

    async download(id, url) {
      // Try to record the download server-side
      try { await api.download(id); } catch (_) {}

      // Trigger native download
      const a = document.createElement('a');
      a.href = url;
      a.download = `walls-${id}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  };

  // ─── Event delegation ─────────────────────────────────────────────────────
  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, url } = btn.dataset;
    if (action === 'open') actions.open(id);
    if (action === 'download') actions.download(id, url);
    if (action === 'close-detail') {
      history.back();
    }
  };

  // ─── Views ────────────────────────────────────────────────────────────────
  const views = {
    home() {
      $detail.style.display = 'none';
      $detail.innerHTML = '';
      $grid.style.display = 'grid';
      $loader.style.display = 'flex';
      state.query = '';
      if ($searchInput) $searchInput.value = '';
      grid.reset();
      grid.load();
    },

    search(q) {
      $detail.style.display = 'none';
      $detail.innerHTML = '';
      $grid.style.display = 'grid';
      $loader.style.display = 'flex';
      state.query = q;
      if ($searchInput) $searchInput.value = q;
      grid.reset();
      grid.load();
    },

    async detail(id) {
      $grid.style.display = 'none';
      $loader.style.display = 'none';
      $detail.style.display = 'flex';
      $detail.innerHTML = `<div class="detail-loading">
        <div class="detail-spinner"></div>
      </div>`;

      try {
        const w = await api.wallpaper(id);
        state.current = w;
        $detail.innerHTML = render.detailView(w);
        qs('#detail-close', $detail).addEventListener('click', () => history.back());
      } catch (err) {
        $detail.innerHTML = render.empty('Wallpaper not found.');
      }
    },
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const setupFilters = () => {
    qsa('.wall-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        qsa('.wall-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        grid.reset();
        grid.load();
      });
    });
  };

  // ─── Search ───────────────────────────────────────────────────────────────
  const setupSearch = () => {
    $searchInput = qs('#wall-search');
    if (!$searchInput) return;
    const doSearch = debounce(q => {
      if (q.length === 0 || q.length > 1) {
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/');
      }
    }, 400);
    $searchInput.addEventListener('input', e => doSearch(e.target.value.trim()));
    $searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/');
      }
    });
  };

  // ─── Public API ───────────────────────────────────────────────────────────
  const WallsSDK = {
    init(options = {}) {
      cfg = { ...cfg, ...options };
      $app = qs(cfg.container);
      if (!$app) return console.error('[WallsSDK] container not found');

      // Build scaffold
      $app.innerHTML = `
        <div id="wall-grid" class="wall-grid"></div>
        <div id="wall-loader" class="wall-loader">
          <div class="wall-spinner"></div>
        </div>
        <div id="wall-detail" class="wall-detail"></div>
      `;

      $grid   = qs('#wall-grid');
      $loader = qs('#wall-loader');
      $detail = qs('#wall-detail');

      $app.addEventListener('click', handleClick);

      setupFilters();
      setupSearch();
      setupInfiniteScroll();
      router.init();
    },

    // Expose for external use
    navigate: (path) => router.push(path),
    refresh: () => { grid.reset(); grid.load(); },
    setFilter: (f) => {
      state.filter = f;
      grid.reset();
      grid.load();
    },
  };

  window.WallsSDK = WallsSDK;
})(window);
