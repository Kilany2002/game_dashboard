App.views = App.views || {};

App.views.rooms = (function () {
  let container;
  let listView;

  const STATUS_LABEL = {
    waiting: 'في الانتظار',
    starting: 'جارية',
  };

  function init(el) {
    container = el;
    container.innerHTML = App.utils.skeletonTable(4, 4);
  }

  async function load() {
    if (App.state.viewCache.rooms) return;
    container.innerHTML = App.utils.skeletonTable(4, 4);

    const { data, error } = await App.api.listRooms();
    if (error) {
      container.innerHTML = App.utils.errorBlock(error.message);
      return;
    }

    App.state.viewCache.rooms = true;
    App.state.roomsCache = data;

    listView = App.components.mountListView(container, {
      title: 'الغرف',
      subtitle: 'الغرف النشطة والمنتهية مع عدد اللاعبين وحالتها.',
      searchPlaceholder: 'ابحث بكود الغرفة أو اسم المضيف...',
      extraFilterHtml: `
        <div class="filter-group filter-group-select">
          <span class="filter-icon">📶</span>
          <select id="rooms-filter-status">
            <option value="">كل الحالات</option>
            <option value="waiting">في الانتظار</option>
            <option value="starting">جارية</option>
          </select>
        </div>`,
      extraFilterIds: ['rooms-filter-status'],
      columns: ['الكود', 'المضيف', 'الحالة', 'اللاعبون', 'أُنشئت', ''],
      emptyIcon: '🚪',
      emptyMessage: 'لا توجد غرف بعد.',
      filterFn: (rows, { search, ['rooms-filter-status']: status }) => {
        let filtered = rows;
        if (search) {
          filtered = filtered.filter((r) =>
            r.code.toLowerCase().includes(search) || r.host_username.toLowerCase().includes(search)
          );
        }
        if (status) filtered = filtered.filter((r) => r.status === status);
        return filtered;
      },
      rowHtml: (row) => `
        <tr>
          <td><span class="chip">${App.utils.escapeHtml(row.code)}</span></td>
          <td>${App.utils.escapeHtml(row.host_username)}</td>
          <td>${App.utils.escapeHtml(STATUS_LABEL[row.status] || row.status)}</td>
          <td>${row.player_count} / ${row.max_players}</td>
          <td>${App.utils.formatDate(row.created_at)}</td>
          <td class="actions-cell">
            <button class="btn-danger" data-action="delete-room" data-code="${App.utils.escapeHtml(row.code)}">إنهاء</button>
          </td>
        </tr>`,
      onTableClick: handleTableClick,
    });

    listView.setRows(App.state.roomsCache);
  }

  async function handleTableClick(e) {
    const button = e.target.closest('button[data-action="delete-room"]');
    if (!button) return;

    const code = button.dataset.code;
    const ok = await App.dialogs.confirm.open('إنهاء الغرفة', `إنهاء الغرفة "${code}"؟ سيُخرج جميع اللاعبين منها فوراً.`);
    if (!ok) return;

    const { error } = await App.api.deleteRoom(code);
    if (error) {
      await App.dialogs.confirm.open('خطأ', error.message, false);
      return;
    }
    invalidate();
    load();
  }

  function invalidate() {
    delete App.state.viewCache.rooms;
  }

  return { init, load, invalidate };
})();
