// Hash-based router. Route name is the first path segment, everything after
// is passed as `params` to the view's load() — used by the categories view
// to encode a drill-down path (#categories/parentId/childId).
App.router = (function () {
  const routes = {};
  const mountedRoutes = new Set();
  let current = { name: 'overview', params: [] };

  function topbarTitle() { return document.getElementById('topbar-title'); }
  function topbarLive() { return document.getElementById('topbar-live'); }

  function registerRoute(name, def) {
    routes[name] = def;
  }

  function parseHash() {
    const parts = location.hash.slice(1).split('/').filter(Boolean);
    const name = parts[0] || 'overview';
    const params = parts.slice(1);
    return routes[name] ? { name, params } : { name: 'overview', params: [] };
  }

  function navigate(name, params = [], push = true) {
    if (!routes[name]) name = 'overview';
    const hash = '#' + [name, ...params].join('/');
    if (push) history.pushState(null, '', hash);
    else history.replaceState(null, '', hash);
    render(name, params);
  }

  function render(name, params) {
    current = { name, params };
    const def = routes[name];

    document.querySelectorAll('.nav-item[data-route]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.route === name);
    });

    topbarTitle().textContent = def.title;
    topbarLive().hidden = !def.liveIndicator;

    document.querySelectorAll('.view-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === 'view-' + name);
    });

    if (!mountedRoutes.has(name)) {
      def.onMount?.(def.el);
      mountedRoutes.add(name);
    }

    def.load(params);
  }

  function initRouter() {
    window.addEventListener('hashchange', () => {
      const { name, params } = parseHash();
      render(name, params);
    });
    const { name, params } = parseHash();
    navigate(name, params, false);
  }

  function refreshCurrent() {
    const def = routes[current.name];
    if (!def) return;
    def.invalidate?.();
    def.load(current.params);
  }

  return { registerRoute, navigate, initRouter, refreshCurrent };
})();
