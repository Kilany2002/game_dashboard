App.components = App.components || {};

// Renders a searchable/filterable table inside `container`. Any new list
// section (leaderboard, questions, rooms, users, ...) just supplies columns,
// a row-html function and a filter function — no copy-pasted markup/wiring.
App.components.mountListView = function mountListView(container, opts) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2>${opts.title}</h2>
        ${opts.subtitle ? `<p>${opts.subtitle}</p>` : ''}
      </div>
      <div class="page-header-actions">${opts.headerActionsHtml || ''}</div>
    </div>
    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-icon">🔍</span>
        <input type="text" class="lv-search" placeholder="${opts.searchPlaceholder || 'بحث...'}" />
      </div>
      ${opts.extraFilterHtml || ''}
    </div>
    <div class="table-card lv-table-card"></div>
  `;

  const searchInput = container.querySelector('.lv-search');
  const tableCard = container.querySelector('.lv-table-card');
  let rows = [];

  function currentFilters() {
    const filters = { search: searchInput.value.toLowerCase().trim() };
    (opts.extraFilterIds || []).forEach((id) => {
      filters[id] = container.querySelector('#' + id)?.value ?? '';
    });
    return filters;
  }

  function render() {
    const filters = currentFilters();
    const filtered = opts.filterFn ? opts.filterFn(rows, filters) : rows;

    if (!filtered.length) {
      const isFiltered = Boolean(filters.search) || Object.keys(filters).some((k) => k !== 'search' && filters[k]);
      tableCard.innerHTML = App.utils.emptyState(opts.emptyIcon || '📭', isFiltered ? 'لا توجد نتائج مطابقة للبحث.' : (opts.emptyMessage || 'لا توجد بيانات بعد.'));
      return;
    }

    tableCard.innerHTML = `
      <table>
        <thead><tr>${opts.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${filtered.map(opts.rowHtml).join('')}</tbody>
      </table>`;

    if (opts.onTableClick) {
      tableCard.querySelector('table').addEventListener('click', (e) => opts.onTableClick(e, filtered));
    }
  }

  searchInput.addEventListener('input', render);
  (opts.extraFilterIds || []).forEach((id) => {
    container.querySelector('#' + id)?.addEventListener('change', render);
  });

  if (opts.onHeaderClick) {
    container.querySelector('.page-header-actions')?.addEventListener('click', opts.onHeaderClick);
  }

  return {
    setRows(newRows) {
      rows = newRows;
      render();
    },
    getRows() {
      return rows;
    },
    rerender: render,
  };
};
