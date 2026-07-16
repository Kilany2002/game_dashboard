App.views = App.views || {};

App.views.categories = (function () {
  let container;
  let pathIds = [];

  function init(el) {
    container = el;
    container.innerHTML = App.utils.skeletonCardGrid();
    container.addEventListener('click', handleClick);

    App.events.on('categories:changed', () => {
      invalidate();
      load(pathIds);
    });
  }

  async function load(params = []) {
    pathIds = params;

    if (!App.state.viewCache.categories) {
      container.innerHTML = App.utils.skeletonCardGrid();
      const { data, error } = await App.api.listCategories();
      if (error) {
        container.innerHTML = App.utils.errorBlock(error.message);
        return;
      }
      App.state.categoriesCache = data;
      App.state.viewCache.categories = true;
    }

    render();
  }

  function invalidate() {
    delete App.state.viewCache.categories;
  }

  function currentCategory() {
    if (!pathIds.length) return null;
    return App.state.categoriesCache.find((c) => c.id === pathIds[pathIds.length - 1]) || null;
  }

  function breadcrumbChain() {
    return pathIds.map((id) => App.state.categoriesCache.find((c) => c.id === id)).filter(Boolean);
  }

  function render() {
    const current = currentCategory();

    // If the hash pointed at a category that no longer exists (e.g. it was
    // just deleted), fall back to the root grid instead of showing a dead end.
    if (pathIds.length && !current) {
      App.router.navigate('categories', [], false);
      return;
    }

    const children = App.state.categoriesCache.filter((c) => (c.parent_id || null) === (current ? current.id : null));

    const crumbs = breadcrumbChain();
    const breadcrumbHtml = `
      <div class="breadcrumb">
        <button type="button" class="breadcrumb-item" data-nav-root>🗂️ الفئات</button>
        ${crumbs.map((c, i) => `
          <span class="breadcrumb-sep">/</span>
          <button type="button" class="breadcrumb-item" data-nav-index="${i}">${App.utils.escapeHtml(c.name)}</button>
        `).join('')}
      </div>`;

    container.innerHTML = `
      <div class="section-header">
        <div>${breadcrumbHtml}</div>
        <div class="page-header-actions">
          <button type="button" class="btn-primary" data-action="add-category" ${current ? `data-parent="${App.utils.escapeHtml(current.id)}"` : ''}>
            + ${current ? 'إضافة فئة فرعية' : 'إضافة فئة'}
          </button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-icon">🔍</span>
          <input type="text" class="categories-search" placeholder="ابحث بالاسم أو المعرّف..." />
        </div>
      </div>
      <div class="category-grid-wrap"></div>
    `;

    const searchInput = container.querySelector('.categories-search');
    const gridWrap = container.querySelector('.category-grid-wrap');

    function renderGrid() {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = q
        ? children.filter((c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        : children;

      if (!filtered.length) {
        const message = q
          ? 'لا توجد نتائج مطابقة للبحث.'
          : current
            ? 'لا توجد فئات فرعية بعد.'
            : 'لا توجد فئات بعد. أضف فئة للبدء.';
        gridWrap.innerHTML = App.utils.emptyGrid('🗂️', message);
        return;
      }

      gridWrap.innerHTML = `<div class="category-grid">${filtered.map(cardHtml).join('')}</div>`;
    }

    function cardHtml(cat) {
      // Depth-agnostic: a card with children drills further into the grid; a
      // card with none is a leaf, so it jumps to its questions instead. This
      // works for two levels today and any deeper nesting later without change.
      const subCount = App.state.categoriesCache.filter((c) => c.parent_id === cat.id).length;
      const isLeaf = subCount === 0;
      const qCount = App.state.questionsCache.filter((q) => q.category_id === cat.id).length;
      const meta = isLeaf ? `${qCount} سؤال` : `${subCount} فئة فرعية`;
      const openAttr = isLeaf ? `data-view-questions="${App.utils.escapeHtml(cat.id)}"` : `data-open="${App.utils.escapeHtml(cat.id)}"`;

      return `
        <div class="category-card" ${openAttr}>
          <div class="category-card-icon">${isLeaf ? '📄' : '🗂️'}</div>
          <div class="category-card-name">${App.utils.escapeHtml(cat.name)}</div>
          <div class="category-card-id">${App.utils.escapeHtml(cat.id)}</div>
          <div class="category-card-meta">${meta}</div>
          <div class="category-card-actions">
            <button type="button" class="btn-link" data-action="edit-category" data-id="${App.utils.escapeHtml(cat.id)}">تعديل</button>
            <button type="button" class="btn-danger" data-action="delete-category" data-id="${App.utils.escapeHtml(cat.id)}">حذف</button>
          </div>
        </div>`;
    }

    searchInput.addEventListener('input', renderGrid);
    renderGrid();
  }

  async function handleClick(e) {
    if (e.target.closest('[data-nav-root]')) {
      App.router.navigate('categories', []);
      return;
    }

    const crumbBtn = e.target.closest('[data-nav-index]');
    if (crumbBtn) {
      const idx = Number(crumbBtn.dataset.navIndex);
      App.router.navigate('categories', pathIds.slice(0, idx + 1));
      return;
    }

    const actionBtn = e.target.closest('button[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;

      if (action === 'add-category') {
        App.dialogs.category.open(null, actionBtn.dataset.parent || null);
        return;
      }

      if (action === 'edit-category') {
        const cat = App.state.categoriesCache.find((c) => c.id === actionBtn.dataset.id);
        if (cat) App.dialogs.category.open(cat);
        return;
      }

      if (action === 'delete-category') {
        const id = actionBtn.dataset.id;
        const ok = await App.dialogs.confirm.open(
          'حذف الفئة',
          `حذف الفئة "${id}"؟ ستُحذف أيضاً جميع الفئات الفرعية والأسئلة المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.`
        );
        if (!ok) return;
        const { error } = await App.api.deleteCategory(id);
        if (error) {
          await App.dialogs.confirm.open('خطأ', error.message, false);
          return;
        }
        invalidate();
        App.router.navigate('categories', pathIds.filter((p) => p !== id));
        return;
      }
      return;
    }

    const questionsCard = e.target.closest('[data-view-questions]');
    if (questionsCard) {
      App.router.navigate('questions', [questionsCard.dataset.viewQuestions]);
      return;
    }

    const card = e.target.closest('[data-open]');
    if (card) App.router.navigate('categories', [...pathIds, card.dataset.open]);
  }

  return { init, load, invalidate };
})();
