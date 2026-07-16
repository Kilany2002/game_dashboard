App.views = App.views || {};

App.views.questions = (function () {
  let container;
  let listView;
  let rowsById = {};

  function init(el) {
    container = el;
    container.innerHTML = App.utils.skeletonTable(3, 4);

    App.events.on('questions:changed', () => {
      invalidate();
      load();
    });
    App.events.on('categories:changed', () => {
      invalidate();
      if (container.dataset.mounted) load();
    });
  }

  // params[0], when present, is a category id to pre-filter by — used when
  // jumping here from a leaf category card in the categories grid.
  async function load(params = []) {
    const presetCategoryId = params[0] || '';

    if (App.state.viewCache.questions) {
      applyPresetCategory(presetCategoryId);
      return;
    }

    container.innerHTML = App.utils.skeletonTable(3, 4);
    container.dataset.mounted = '1';

    if (!App.state.categoriesCache.length) {
      const { data } = await App.api.listCategories();
      if (data) App.state.categoriesCache = data;
    }

    const { data, error } = await App.api.listQuestions();
    if (error) {
      container.innerHTML = App.utils.errorBlock(error.message);
      return;
    }

    App.state.viewCache.questions = true;
    App.state.questionsCache = data;
    rowsById = Object.fromEntries(data.map((r) => [r.id, r]));

    listView = App.components.mountListView(container, {
      title: 'الأسئلة',
      headerActionsHtml: '<button class="btn-primary" data-action="add-question">+ إضافة سؤال</button>',
      searchPlaceholder: 'ابحث بنص السؤال أو الإجابة...',
      extraFilterHtml: `
        <div class="filter-group filter-group-select">
          <span class="filter-icon">🏷️</span>
          <select id="questions-filter-category">
            <option value="">جميع الفئات</option>
            ${App.dialogs.question.buildCategoryOptions(App.state.categoriesCache)}
          </select>
        </div>`,
      extraFilterIds: ['questions-filter-category'],
      columns: ['الفئة', 'السؤال', 'الإجابة الصحيحة', ''],
      emptyIcon: '❓',
      emptyMessage: 'لا توجد أسئلة بعد. أضف سؤالاً للبدء.',
      filterFn: (rows, { search, ['questions-filter-category']: cat }) => {
        let filtered = rows;
        if (search) {
          filtered = filtered.filter((q) =>
            q.text.toLowerCase().includes(search) || q.correct_answer.toLowerCase().includes(search)
          );
        }
        if (cat) filtered = filtered.filter((q) => q.category_id === cat);
        return filtered;
      },
      rowHtml: (row) => `
        <tr>
          <td><span class="chip">${App.utils.escapeHtml(row.category_name)}</span></td>
          <td class="question-text">${App.utils.escapeHtml(row.text)}</td>
          <td>${App.utils.escapeHtml(row.correct_answer)}</td>
          <td class="actions-cell">
            <button class="btn-link" data-action="edit-question" data-id="${App.utils.escapeHtml(row.id)}">تعديل</button>
            <button class="btn-danger" data-action="delete-question" data-id="${App.utils.escapeHtml(row.id)}">حذف</button>
          </td>
        </tr>`,
      onTableClick: handleTableClick,
      onHeaderClick: handleHeaderClick,
    });

    listView.setRows(App.state.questionsCache);
    applyPresetCategory(presetCategoryId);
  }

  function applyPresetCategory(categoryId) {
    if (!categoryId) return;
    const select = container.querySelector('#questions-filter-category');
    if (!select) return;
    select.value = categoryId;
    listView?.rerender();
  }

  function handleHeaderClick(e) {
    const btn = e.target.closest('[data-action="add-question"]');
    if (btn) App.dialogs.question.open(null);
  }

  async function handleTableClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;

    if (button.dataset.action === 'edit-question') {
      const question = rowsById[id];
      if (question) App.dialogs.question.open(question);
      return;
    }

    if (button.dataset.action === 'delete-question') {
      const ok = await App.dialogs.confirm.open('حذف السؤال', 'حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.');
      if (!ok) return;
      const { error } = await App.api.deleteQuestion(id);
      if (error) {
        await App.dialogs.confirm.open('خطأ', error.message, false);
        return;
      }
      invalidate();
      load();
    }
  }

  function invalidate() {
    delete App.state.viewCache.questions;
  }

  return { init, load, invalidate };
})();
