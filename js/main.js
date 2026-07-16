(async function boot() {
  const session = await App.auth.requireSession();
  if (!session) return; // requireSession already redirected to login.html

  document.getElementById('app-shell').hidden = false;

  document.getElementById('logout-button').addEventListener('click', async () => {
    await App.sb.auth.signOut();
    location.replace('login.html');
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.close).close();
    });
  });

  App.dialogs.confirm.init();
  App.dialogs.category.init();
  App.dialogs.question.init();

  App.router.registerRoute('overview', {
    title: 'نظرة عامة',
    liveIndicator: true,
    el: document.getElementById('view-overview'),
    onMount: App.views.overview.init,
    load: App.views.overview.load,
    invalidate: App.views.overview.invalidate,
  });

  App.router.registerRoute('leaderboard', {
    title: 'المتصدرون',
    liveIndicator: false,
    el: document.getElementById('view-leaderboard'),
    onMount: App.views.leaderboard.init,
    load: App.views.leaderboard.load,
    invalidate: App.views.leaderboard.invalidate,
  });

  App.router.registerRoute('categories', {
    title: 'الفئات',
    liveIndicator: false,
    el: document.getElementById('view-categories'),
    onMount: App.views.categories.init,
    load: App.views.categories.load,
    invalidate: App.views.categories.invalidate,
  });

  App.router.registerRoute('questions', {
    title: 'الأسئلة',
    liveIndicator: false,
    el: document.getElementById('view-questions'),
    onMount: App.views.questions.init,
    load: App.views.questions.load,
    invalidate: App.views.questions.invalidate,
  });

  App.router.registerRoute('rooms', {
    title: 'الغرف',
    liveIndicator: true,
    el: document.getElementById('view-rooms'),
    onMount: App.views.rooms.init,
    load: App.views.rooms.load,
    invalidate: App.views.rooms.invalidate,
  });

  App.router.registerRoute('users', {
    title: 'المستخدمون',
    liveIndicator: false,
    el: document.getElementById('view-users'),
    onMount: App.views.users.init,
    load: App.views.users.load,
    invalidate: App.views.users.invalidate,
  });

  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-route]');
    if (btn) App.router.navigate(btn.dataset.route, []);
  });

  document.getElementById('refresh-button').addEventListener('click', App.router.refreshCurrent);

  App.router.initRouter();
})();
