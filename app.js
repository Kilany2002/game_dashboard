const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ─── DOM refs ──────────────────────────────────────────────────────────────

const loginScreen  = document.getElementById('login-screen');
const appShell     = document.getElementById('app-shell');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');
const loginErrorTx = document.getElementById('login-error-text');
const loginButton  = document.getElementById('login-button');
const topbarTitle  = document.getElementById('topbar-title');
const topbarLive   = document.getElementById('topbar-live');

// ─── State ─────────────────────────────────────────────────────────────────

let signupsChart   = null;
let categoryChart  = null;
let categoriesCache = [];
let questionsCache = [];
let leaderboardCache = [];
const viewCache = {};

// ─── Auth ──────────────────────────────────────────────────────────────────

async function init() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  appShell.hidden = true;
}

function showApp() {
  loginScreen.hidden = true;
  appShell.hidden = false;
  setupFilters();
  const initial = (location.hash.slice(1)) || 'overview';
  navigate(initial, false);
}

function setupFilters() {
  if (setupFilters._bound) return;
  setupFilters._bound = true;

  document.getElementById('leaderboard-search').addEventListener('input', filterAndRenderLeaderboard);
  document.getElementById('categories-search').addEventListener('input', filterAndRenderCategories);
  document.getElementById('categories-filter-parent').addEventListener('change', filterAndRenderCategories);
  document.getElementById('questions-search').addEventListener('input', filterAndRenderQuestions);
  document.getElementById('questions-filter-category').addEventListener('change', filterAndRenderQuestions);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginButton.disabled = true;
  loginButton.textContent = 'جارٍ تسجيل الدخول…';

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { error } = await sb.auth.signInWithPassword({ email, password });

  loginButton.disabled = false;
  loginButton.textContent = 'تسجيل الدخول';

  if (error) {
    loginErrorTx.textContent = error.message;
    loginError.hidden = false;
    return;
  }

  showApp();
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ─── Router ────────────────────────────────────────────────────────────────

const ROUTES = {
  overview:    { title: 'نظرة عامة',   liveIndicator: true },
  leaderboard: { title: 'المتصدرون',   liveIndicator: false },
  categories:  { title: 'الفئات',      liveIndicator: false },
  questions:   { title: 'الأسئلة',     liveIndicator: false },
};

function navigate(route, pushHash = true) {
  if (!ROUTES[route]) route = 'overview';

  if (pushHash) {
    history.pushState(null, '', '#' + route);
  } else {
    history.replaceState(null, '', '#' + route);
  }

  document.querySelectorAll('.nav-item[data-route]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === route);
  });

  const meta = ROUTES[route];
  topbarTitle.textContent = meta.title;
  topbarLive.hidden = !meta.liveIndicator;

  document.querySelectorAll('.view-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === 'view-' + route);
  });

  loadView(route);
}

window.addEventListener('hashchange', () => {
  const route = location.hash.slice(1) || 'overview';
  navigate(route, false);
});

document.getElementById('sidebar-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-route]');
  if (btn) navigate(btn.dataset.route);
});

document.getElementById('refresh-button').addEventListener('click', () => {
  const route = (location.hash.slice(1)) || 'overview';
  delete viewCache[route];
  loadView(route);
});

// ─── Per-view loaders ──────────────────────────────────────────────────────

async function loadView(route) {
  if (viewCache[route]) return;

  switch (route) {
    case 'overview':    return loadOverview();
    case 'leaderboard': return loadLeaderboard();
    case 'categories':  return loadCategories();
    case 'questions':   return loadQuestions();
  }
}

// ─── Overview ──────────────────────────────────────────────────────────────

async function loadOverview() {
  const container = document.getElementById('overview-content');
  container.innerHTML = skeletonOverview();

  const [liveRes, growthRes, engRes] = await Promise.all([
    sb.rpc('dashboard_live_activity'),
    sb.rpc('dashboard_growth'),
    sb.rpc('dashboard_engagement'),
  ]);

  const err = [liveRes, growthRes, engRes].find((r) => r.error)?.error;
  if (err) {
    container.innerHTML = errorBlock(err.message);
    return;
  }

  viewCache['overview'] = true;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>نظرة عامة</h2>
        <p>مقاييس النشاط الحي والنمو والتفاعل.</p>
      </div>
    </div>

    <div class="section-label">النشاط الحي</div>
    <div class="stat-grid" id="live-activity-stats"></div>

    <div class="section-label">النمو</div>
    <div class="stat-grid" id="growth-stats"></div>

    <div class="overview-charts-grid">
      <div class="chart-card">
        <h3>التسجيلات — آخر 30 يوم</h3>
        <canvas id="signups-chart" height="140"></canvas>
      </div>
      <div class="chart-card">
        <h3>شعبية الفئات</h3>
        <canvas id="category-chart" height="140"></canvas>
      </div>
    </div>

    <div class="section-label">التفاعل</div>
    <div class="stat-grid" id="engagement-stats"></div>
  `;

  renderLiveActivity(liveRes.data);
  renderGrowth(growthRes.data);
  renderEngagement(engRes.data);
}

function skeletonOverview() {
  const skGrid = (n) => `
    <div class="skeleton-stat-grid">
      ${Array.from({ length: n }, () => `
        <div class="skeleton-stat-card">
          <div class="skeleton sk-value"></div>
          <div class="skeleton sk-label"></div>
        </div>`).join('')}
    </div>`;
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>نظرة عامة</h2>
        <p>مقاييس النشاط الحي والنمو والتفاعل.</p>
      </div>
    </div>
    <div class="section-label">النشاط الحي</div>
    ${skGrid(4)}
    <div class="section-label">النمو</div>
    ${skGrid(3)}
    <div class="section-label">التفاعل</div>
    ${skGrid(4)}`;
}

// ─── Leaderboard ───────────────────────────────────────────────────────────

async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-content');
  container.innerHTML = skeletonTable(5, 5);

  const { data, error } = await sb.rpc('dashboard_leaderboard');
  if (error) { container.innerHTML = errorBlock(error.message); return; }

  viewCache['leaderboard'] = true;
  leaderboardCache = data;
  filterAndRenderLeaderboard();
}

// ─── Categories ────────────────────────────────────────────────────────────

async function loadCategories() {
  const container = document.getElementById('categories-content');
  if (!container) return;
  container.innerHTML = skeletonTable(3, 4);

  const { data, error } = await sb.rpc('dashboard_list_categories');
  if (error) { container.innerHTML = errorBlock(error.message); return; }

  viewCache['categories'] = true;
  categoriesCache = data;
  updateQuestionsCategoryFilter();
  filterAndRenderCategories();
}

async function reloadCategories() {
  delete viewCache['categories'];
  await loadCategories();
}

// ─── Questions ──────────────────────────────────────────────────────────────

async function loadQuestions() {
  const container = document.getElementById('questions-content');
  if (!container) return;
  container.innerHTML = skeletonTable(3, 4);

  if (!categoriesCache.length) {
    const { data } = await sb.rpc('dashboard_list_categories');
    if (data) {
      categoriesCache = data;
      updateQuestionsCategoryFilter();
    }
  }

  const { data, error } = await sb.rpc('dashboard_list_questions');
  if (error) { container.innerHTML = errorBlock(error.message); return; }

  viewCache['questions'] = true;
  questionsCache = data;
  filterAndRenderQuestions();
}

async function reloadQuestions() {
  delete viewCache['questions'];
  await loadQuestions();
}

// ─── Filter & Render Helpers ────────────────────────────────────────────────

function filterAndRenderLeaderboard() {
  const searchVal = document.getElementById('leaderboard-search').value.toLowerCase().trim();
  let filtered = leaderboardCache;

  if (searchVal) {
    filtered = filtered.filter((row) => row.username.toLowerCase().includes(searchVal));
  }

  const container = document.getElementById('leaderboard-content');
  renderLeaderboard(filtered, container);
}

function filterAndRenderCategories() {
  const searchVal = document.getElementById('categories-search').value.toLowerCase().trim();
  const parentVal = document.getElementById('categories-filter-parent').value;

  let filtered = categoriesCache;

  if (searchVal) {
    filtered = filtered.filter((c) =>
      c.id.toLowerCase().includes(searchVal) || c.name.toLowerCase().includes(searchVal)
    );
  }

  if (parentVal === 'top') {
    filtered = filtered.filter((c) => !c.parent_id);
  } else if (parentVal === 'sub') {
    filtered = filtered.filter((c) => c.parent_id);
  }

  const container = document.getElementById('categories-content');
  renderCategories(filtered, container);
}

function filterAndRenderQuestions() {
  const searchVal = document.getElementById('questions-search').value.toLowerCase().trim();
  const catVal = document.getElementById('questions-filter-category').value;

  let filtered = questionsCache;

  if (searchVal) {
    filtered = filtered.filter((q) =>
      q.text.toLowerCase().includes(searchVal) || q.correct_answer.toLowerCase().includes(searchVal)
    );
  }

  if (catVal) {
    filtered = filtered.filter((q) => q.category_id === catVal);
  }

  const container = document.getElementById('questions-content');
  renderQuestions(filtered, container);
}

function updateQuestionsCategoryFilter() {
  const select = document.getElementById('questions-filter-category');
  if (select) {
    select.innerHTML = '<option value="">جميع الفئات</option>' + buildCategoryOptions(categoriesCache);
  }
}

// ─── Render: Live Activity ──────────────────────────────────────────────────

function renderLiveActivity(stats) {
  document.getElementById('live-activity-stats').innerHTML = [
    statCard('🔴', stats.active_rooms,            'غرف نشطة',                 true),
    statCard('👥', stats.players_in_active_rooms, 'لاعبون في غرف نشطة',       true),
    statCard('⏳', stats.waiting_rooms,           'غرف في الانتظار'),
    statCard('🙋', stats.players_waiting,         'لاعبون في الانتظار'),
  ].join('');
}

// ─── Render: Growth ─────────────────────────────────────────────────────────

function renderGrowth(stats) {
  document.getElementById('growth-stats').innerHTML = [
    statCard('👤', stats.total_users,      'إجمالي المستخدمين',  true),
    statCard('📝', stats.total_registered, 'حسابات مسجّلة'),
    statCard('👻', stats.total_guests,     'جلسات زوار'),
  ].join('');

  const labels     = stats.daily_signups.map((d) => d.day);
  const registered = stats.daily_signups.map((d) => d.registered_signups);
  const guests     = stats.daily_signups.map((d) => d.guest_signups);

  if (signupsChart) signupsChart.destroy();
  signupsChart = new Chart(document.getElementById('signups-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'مسجّلون', data: registered, backgroundColor: '#4f6ef7', borderRadius: 4 },
        { label: 'زوار',    data: guests,     backgroundColor: '#f59e0b', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { boxRadius: 4, font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: { family: 'Inter', size: 11 } } },
      },
    },
  });
}

// ─── Render: Engagement ─────────────────────────────────────────────────────

function renderEngagement(stats) {
  document.getElementById('engagement-stats').innerHTML = [
    statCard('✅', stats.completed_rooms,    'ألعاب مكتملة',             true),
    statCard('▶️', stats.in_progress_rooms,  'ألعاب جارية'),
    statCard('🕐', stats.waiting_rooms,      'غرف في الانتظار'),
    statCard('🔁', stats.avg_rounds_per_room,'متوسط الجولات لكل غرفة'),
  ].join('');

  const labels = stats.category_popularity.map((c) => c.name);
  const values = stats.category_popularity.map((c) => c.times_played);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('category-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'مرات اللعب', data: values, backgroundColor: '#4f6ef7', borderRadius: 4 }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0, font: { family: 'Inter', size: 11 } }, grid: { display: false } },
        y: { ticks: { font: { family: 'Inter', size: 11 } } },
      },
    },
  });
}

// ─── Render: Leaderboard ────────────────────────────────────────────────────

function renderLeaderboard(rows, container) {
  if (!rows.length) {
    const isFiltered = document.getElementById('leaderboard-search').value.trim();
    container.innerHTML = emptyState('🏆', isFiltered ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد لاعبون بعد.');
    return;
  }

  container.innerHTML = `
    <table id="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th>اللاعب</th>
          <th>انتصارات</th>
          <th>ألعاب لعبها</th>
          <th>مجموع النقاط</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr>
            <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
            <td><strong>${escapeHtml(row.username)}</strong></td>
            <td>${row.wins}</td>
            <td>${row.games_played}</td>
            <td><span class="chip">${row.total_points} نقطة</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ─── Render: Categories ─────────────────────────────────────────────────────

function renderCategories(rows, container) {
  if (!rows.length) {
    const isFiltered = document.getElementById('categories-search').value.trim() || document.getElementById('categories-filter-parent').value;
    container.innerHTML = emptyState('🗂️', isFiltered ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد فئات بعد. أضف فئة للبدء.');
    return;
  }

  container.innerHTML = `
    <table id="categories-table">
      <thead>
        <tr><th>المعرّف</th><th>الاسم</th><th>الأم</th><th></th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.parent_id ? '<span class="subcategory-indent">↳</span> ' : ''}${escapeHtml(row.id)}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${row.parent_name ? escapeHtml(row.parent_name) : '<span style="color:var(--text-3)">—</span>'}</td>
            <td class="actions-cell">
              ${!row.parent_id
                ? `<button class="btn-link" data-action="add-subcategory" data-id="${escapeHtml(row.id)}">+ فرعية</button>`
                : ''}
              <button class="btn-link" data-action="edit-category" data-id="${escapeHtml(row.id)}">تعديل</button>
              <button class="btn-danger" data-action="delete-category" data-id="${escapeHtml(row.id)}">حذف</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  document.getElementById('categories-table').addEventListener('click', categoriesTableHandler);
}

// ─── Render: Questions ──────────────────────────────────────────────────────

function renderQuestions(rows, container) {
  if (!rows.length) {
    const isFiltered = document.getElementById('questions-search').value.trim() || document.getElementById('questions-filter-category').value;
    container.innerHTML = emptyState('❓', isFiltered ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد أسئلة بعد. أضف سؤالاً للبدء.');
    return;
  }

  container.innerHTML = `
    <table id="questions-table">
      <thead>
        <tr><th>الفئة</th><th>السؤال</th><th>الإجابة الصحيحة</th><th></th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><span class="chip">${escapeHtml(row.category_name)}</span></td>
            <td class="question-text">${escapeHtml(row.text)}</td>
            <td>${escapeHtml(row.correct_answer)}</td>
            <td class="actions-cell">
              <button class="btn-link" data-action="edit-question" data-id="${escapeHtml(row.id)}">تعديل</button>
              <button class="btn-danger" data-action="delete-question" data-id="${escapeHtml(row.id)}">حذف</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  renderQuestions._rowsById = Object.fromEntries(rows.map((r) => [r.id, r]));
  document.getElementById('questions-table').addEventListener('click', questionsTableHandler);
}

// ─── Table event handlers ────────────────────────────────────────────────────

async function categoriesTableHandler(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === 'edit-category') {
    const category = categoriesCache.find((c) => c.id === id);
    if (category) openCategoryDialog(category);
    return;
  }

  if (button.dataset.action === 'add-subcategory') {
    openCategoryDialog(null, id);
    return;
  }

  if (button.dataset.action === 'delete-category') {
    const ok = await confirmDialog(
      'حذف الفئة',
      `حذف الفئة "${id}"؟ ستُحذف أيضاً جميع الفئات الفرعية والأسئلة المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.`
    );
    if (!ok) return;
    const { error } = await sb.rpc('dashboard_delete_category', { p_id: id });
    if (error) { await confirmDialog('خطأ', error.message, false); return; }
    reloadCategories();
  }
}

async function questionsTableHandler(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === 'edit-question') {
    const question = renderQuestions._rowsById?.[id];
    if (question) openQuestionDialog(question);
    return;
  }

  if (button.dataset.action === 'delete-question') {
    const ok = await confirmDialog('حذف السؤال', 'حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!ok) return;
    const { error } = await sb.rpc('dashboard_delete_question', { p_id: id });
    if (error) { await confirmDialog('خطأ', error.message, false); return; }
    reloadQuestions();
  }
}

// ─── Add / Edit buttons ──────────────────────────────────────────────────────

document.getElementById('add-category-button').addEventListener('click', () => {
  openCategoryDialog(null, null);
});

document.getElementById('add-question-button').addEventListener('click', () => {
  if (!hasAnySubcategory(categoriesCache)) {
    confirmDialog(
      'لا توجد فئات فرعية بعد',
      'أضف فئة فرعية أولاً — يمكن ربط الأسئلة بالفئات الفرعية فقط، وليس بالفئات الرئيسية.',
      false
    );
    return;
  }
  openQuestionDialog(null);
});

// ─── Category dialog ────────────────────────────────────────────────────────

const categoryDialog       = document.getElementById('category-dialog');
const categoryForm         = document.getElementById('category-form');
const categoryIdInput      = document.getElementById('category-id');
const categoryNameInput    = document.getElementById('category-name');
const categoryParentSelect = document.getElementById('category-parent');
const categoryErrorDiv     = document.getElementById('category-error');
const categoryErrorText    = document.getElementById('category-error-text');

function openCategoryDialog(category, presetParentId) {
  categoryErrorDiv.hidden = true;
  categoryForm.reset();

  const isEditing = category !== null;

  const parentOptions = categoriesCache.filter((c) => !c.parent_id && c.id !== category?.id);
  categoryParentSelect.innerHTML =
    '<option value="">لا شيء (فئة رئيسية)</option>' +
    parentOptions.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  categoryParentSelect.value = isEditing ? category.parent_id ?? '' : presetParentId ?? '';

  updateCategoryDialogTitle(isEditing, Boolean(categoryParentSelect.value));

  categoryIdInput.value    = isEditing ? category.id : '';
  categoryIdInput.disabled = isEditing;
  categoryNameInput.value  = isEditing ? category.name : '';

  categoryDialog.showModal();
}

categoryParentSelect.addEventListener('change', () => {
  updateCategoryDialogTitle(categoryIdInput.disabled, Boolean(categoryParentSelect.value));
});

function updateCategoryDialogTitle(isEditing, hasParent) {
  document.getElementById('category-dialog-title').textContent =
    isEditing
      ? (hasParent ? 'تعديل فئة فرعية' : 'تعديل الفئة')
      : (hasParent ? 'إضافة فئة فرعية'  : 'إضافة فئة');
}

categoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  categoryErrorDiv.hidden = true;

  const { error } = await sb.rpc('dashboard_upsert_category', {
    p_id:        categoryIdInput.value.trim().toLowerCase().replace(/\s+/g, '_'),
    p_name:      categoryNameInput.value.trim(),
    p_parent_id: categoryParentSelect.value || null,
  });

  if (error) {
    categoryErrorText.textContent = error.message;
    categoryErrorDiv.hidden = false;
    return;
  }

  categoryDialog.close();
  reloadCategories();
  reloadQuestions();
});

// ─── Question dialog ────────────────────────────────────────────────────────

const questionDialog         = document.getElementById('question-dialog');
const questionForm           = document.getElementById('question-form');
const questionOriginalId     = document.getElementById('question-original-id');
const questionCategorySelect = document.getElementById('question-category');
const questionTextInput      = document.getElementById('question-text');
const questionAnswerInput    = document.getElementById('question-answer');
const questionErrorDiv       = document.getElementById('question-error');
const questionErrorText      = document.getElementById('question-error-text');

function openQuestionDialog(question) {
  questionErrorDiv.hidden = true;
  questionForm.reset();

  questionCategorySelect.innerHTML = buildCategoryOptions(categoriesCache);

  const isEditing = question !== null;
  document.getElementById('question-dialog-title').textContent =
    isEditing ? 'تعديل السؤال' : 'إضافة سؤال';
  questionOriginalId.value     = isEditing ? question.id             : '';
  questionCategorySelect.value = isEditing ? question.category_id    : '';
  questionTextInput.value      = isEditing ? question.text           : '';
  questionAnswerInput.value    = isEditing ? question.correct_answer  : '';

  questionDialog.showModal();
}

questionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  questionErrorDiv.hidden = true;

  const { error } = await sb.rpc('dashboard_upsert_question', {
    p_id:             questionOriginalId.value || null,
    p_category_id:    questionCategorySelect.value,
    p_text:           questionTextInput.value.trim(),
    p_correct_answer: questionAnswerInput.value.trim(),
  });

  if (error) {
    questionErrorText.textContent = error.message;
    questionErrorDiv.hidden = false;
    return;
  }

  questionDialog.close();
  reloadQuestions();
});

// ─── Dialog close buttons ────────────────────────────────────────────────────

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.close).close();
  });
});

// ─── Custom confirm dialog ──────────────────────────────────────────────────

let _confirmResolve = null;
const confirmDialogEl  = document.getElementById('confirm-dialog');
const confirmTitle     = document.getElementById('confirm-dialog-title');
const confirmMessage   = document.getElementById('confirm-dialog-message');
const confirmOkBtn     = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmCloseBtn  = document.getElementById('confirm-close-btn');

function confirmDialog(title, message, showCancel = true) {
  confirmTitle.textContent   = title;
  confirmMessage.textContent = message;
  confirmCancelBtn.hidden    = !showCancel;
  confirmCloseBtn.hidden     = !showCancel;
  confirmOkBtn.textContent   = showCancel ? 'حذف' : 'حسناً';
  confirmOkBtn.style.background = showCancel ? 'var(--danger)' : 'var(--primary)';
  confirmDialogEl.showModal();

  return new Promise((resolve) => {
    _confirmResolve = resolve;
  });
}

confirmOkBtn.addEventListener('click', () => {
  confirmDialogEl.close();
  _confirmResolve?.(true);
  _confirmResolve = null;
});

[confirmCancelBtn, confirmCloseBtn].forEach((btn) => {
  btn.addEventListener('click', () => {
    confirmDialogEl.close();
    _confirmResolve?.(false);
    _confirmResolve = null;
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function statCard(icon, value, label, accent = false) {
  return `
    <div class="stat-card ${accent ? 'accent' : ''}">
      <span class="stat-icon">${icon}</span>
      <div class="value">${value ?? 0}</div>
      <div class="label">${label}</div>
    </div>`;
}

function emptyState(icon, message) {
  return `
    <table><tbody>
      <tr class="empty-state-row">
        <td>
          <span class="empty-icon">${icon}</span>
          ${escapeHtml(message)}
        </td>
      </tr>
    </tbody></table>`;
}

function errorBlock(message) {
  return `
    <div class="inline-error" style="margin:20px">
      <span>⚠</span>
      <span>تعذّر تحميل البيانات: ${escapeHtml(message)}</span>
    </div>`;
}

function skeletonTable(cols, rows) {
  const row = `
    <div class="skeleton-row">
      ${Array.from({ length: cols }, (_, i) =>
        `<div class="skeleton skeleton-cell ${i === 0 ? 'sm' : i === 1 ? 'lg' : ''}"></div>`
      ).join('')}
    </div>`;
  return `<div class="skeleton-table">${Array.from({ length: rows }, () => row).join('')}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function buildCategoryOptions(categories) {
  const topLevel = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const childrenByParent = {};
  categories.forEach((c) => {
    if (c.parent_id) (childrenByParent[c.parent_id] ??= []).push(c);
  });

  return topLevel.map((parent) => {
    const children = (childrenByParent[parent.id] || []).sort((a, b) => a.name.localeCompare(b.name));
    if (!children.length) return '';
    const options = children
      .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
      .join('');
    return `<optgroup label="${escapeHtml(parent.name)}">${options}</optgroup>`;
  }).join('');
}

function hasAnySubcategory(categories) {
  return categories.some((c) => c.parent_id);
}

// ─── Boot ──────────────────────────────────────────────────────────────────

init();
