App.views = App.views || {};

App.views.leaderboard = (function () {
  let container;
  let listView;

  function init(el) {
    container = el;
    container.innerHTML = App.utils.skeletonTable(5, 5);
  }

  async function load() {
    if (App.state.viewCache.leaderboard) return;
    container.innerHTML = App.utils.skeletonTable(5, 5);

    const { data, error } = await App.api.fetchLeaderboard();
    if (error) {
      container.innerHTML = App.utils.errorBlock(error.message);
      return;
    }

    App.state.viewCache.leaderboard = true;
    App.state.leaderboardCache = data;

    listView = App.components.mountListView(container, {
      title: 'المتصدرون',
      subtitle: 'أفضل اللاعبين مرتبين حسب الانتصارات والنقاط الكلية.',
      searchPlaceholder: 'ابحث عن لاعب بالاسم...',
      columns: ['#', 'اللاعب', 'انتصارات', 'ألعاب لعبها', 'مجموع النقاط'],
      emptyIcon: '🏆',
      emptyMessage: 'لا يوجد لاعبون بعد.',
      filterFn: (rows, { search }) =>
        search ? rows.filter((r) => r.username.toLowerCase().includes(search)) : rows,
      rowHtml: (row) => {
        const rank = App.state.leaderboardCache.indexOf(row);
        const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1;
        return `
          <tr>
            <td>${medal}</td>
            <td><strong>${App.utils.escapeHtml(row.username)}</strong></td>
            <td>${row.wins}</td>
            <td>${row.games_played}</td>
            <td><span class="chip">${row.total_points} نقطة</span></td>
          </tr>`;
      },
    });

    listView.setRows(App.state.leaderboardCache);
  }

  function invalidate() {
    delete App.state.viewCache.leaderboard;
  }

  return { init, load, invalidate };
})();
