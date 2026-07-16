App.views = App.views || {};

App.views.users = (function () {
  let container;
  let listView;

  function init(el) {
    container = el;
    container.innerHTML = App.utils.skeletonTable(4, 5);
  }

  async function load() {
    if (App.state.viewCache.users) return;
    container.innerHTML = App.utils.skeletonTable(4, 5);

    const { data, error } = await App.api.listUsers();
    if (error) {
      container.innerHTML = App.utils.errorBlock(error.message);
      return;
    }

    App.state.viewCache.users = true;
    App.state.usersCache = data;

    listView = App.components.mountListView(container, {
      title: 'المستخدمون',
      subtitle: 'كل الحسابات المسجّلة مع إحصائيات لعبهم.',
      searchPlaceholder: 'ابحث باسم المستخدم...',
      columns: ['اللاعب', 'انتصارات', 'ألعاب لعبها', 'مجموع النقاط', 'انضم في'],
      emptyIcon: '👤',
      emptyMessage: 'لا يوجد مستخدمون بعد.',
      filterFn: (rows, { search }) =>
        search ? rows.filter((u) => u.username.toLowerCase().includes(search)) : rows,
      rowHtml: (row) => `
        <tr>
          <td><strong>${App.utils.escapeHtml(row.username)}</strong></td>
          <td>${row.wins}</td>
          <td>${row.games_played}</td>
          <td><span class="chip">${row.total_points} نقطة</span></td>
          <td>${App.utils.formatDate(row.created_at)}</td>
        </tr>`,
    });

    listView.setRows(App.state.usersCache);
  }

  function invalidate() {
    delete App.state.viewCache.users;
  }

  return { init, load, invalidate };
})();
