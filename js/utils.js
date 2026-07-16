App.utils = {
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  },

  statCard(icon, value, label, accent = false) {
    return `
      <div class="stat-card ${accent ? 'accent' : ''}">
        <span class="stat-icon">${icon}</span>
        <div class="value">${value ?? 0}</div>
        <div class="label">${label}</div>
      </div>`;
  },

  emptyState(icon, message) {
    return `
      <table><tbody>
        <tr class="empty-state-row">
          <td>
            <span class="empty-icon">${icon}</span>
            ${App.utils.escapeHtml(message)}
          </td>
        </tr>
      </tbody></table>`;
  },

  emptyGrid(icon, message) {
    return `
      <div class="empty-grid-state">
        <span class="empty-icon">${icon}</span>
        <p>${App.utils.escapeHtml(message)}</p>
      </div>`;
  },

  errorBlock(message) {
    return `
      <div class="inline-error" style="margin:20px">
        <span>⚠</span>
        <span>تعذّر تحميل البيانات: ${App.utils.escapeHtml(message)}</span>
      </div>`;
  },

  skeletonTable(cols, rows) {
    const row = `
      <div class="skeleton-row">
        ${Array.from({ length: cols }, (_, i) =>
          `<div class="skeleton skeleton-cell ${i === 0 ? 'sm' : i === 1 ? 'lg' : ''}"></div>`
        ).join('')}
      </div>`;
    return `<div class="skeleton-table">${Array.from({ length: rows }, () => row).join('')}</div>`;
  },

  skeletonStatGrid(n) {
    return `
      <div class="skeleton-stat-grid">
        ${Array.from({ length: n }, () => `
          <div class="skeleton-stat-card">
            <div class="skeleton sk-value"></div>
            <div class="skeleton sk-label"></div>
          </div>`).join('')}
      </div>`;
  },

  skeletonCardGrid(n = 6) {
    return `
      <div class="category-grid">
        ${Array.from({ length: n }, () => `
          <div class="category-card skeleton-card">
            <div class="skeleton sk-icon"></div>
            <div class="skeleton sk-name"></div>
            <div class="skeleton sk-meta"></div>
          </div>`).join('')}
      </div>`;
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' });
  },
};
