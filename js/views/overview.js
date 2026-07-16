App.views = App.views || {};

App.views.overview = (function () {
  let container;
  let signupsChart = null;
  let categoryChart = null;

  function init(el) {
    container = el;
  }

  async function load() {
    if (App.state.viewCache.overview) return;
    container.innerHTML = skeleton();

    const [liveRes, growthRes, engRes] = await Promise.all([
      App.api.fetchLiveActivity(),
      App.api.fetchGrowth(),
      App.api.fetchEngagement(),
    ]);

    const err = [liveRes, growthRes, engRes].find((r) => r.error)?.error;
    if (err) {
      container.innerHTML = App.utils.errorBlock(err.message);
      return;
    }

    App.state.viewCache.overview = true;

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

  function invalidate() {
    delete App.state.viewCache.overview;
  }

  function skeleton() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <h2>نظرة عامة</h2>
          <p>مقاييس النشاط الحي والنمو والتفاعل.</p>
        </div>
      </div>
      <div class="section-label">النشاط الحي</div>
      ${App.utils.skeletonStatGrid(4)}
      <div class="section-label">النمو</div>
      ${App.utils.skeletonStatGrid(3)}
      <div class="section-label">التفاعل</div>
      ${App.utils.skeletonStatGrid(4)}`;
  }

  function renderLiveActivity(stats) {
    document.getElementById('live-activity-stats').innerHTML = [
      App.utils.statCard('🔴', stats.active_rooms, 'غرف نشطة', true),
      App.utils.statCard('👥', stats.players_in_active_rooms, 'لاعبون في غرف نشطة', true),
      App.utils.statCard('⏳', stats.waiting_rooms, 'غرف في الانتظار'),
      App.utils.statCard('🙋', stats.players_waiting, 'لاعبون في الانتظار'),
    ].join('');
  }

  function renderGrowth(stats) {
    document.getElementById('growth-stats').innerHTML = [
      App.utils.statCard('👤', stats.total_users, 'إجمالي المستخدمين', true),
      App.utils.statCard('📝', stats.total_registered, 'حسابات مسجّلة'),
      App.utils.statCard('👻', stats.total_guests, 'جلسات زوار'),
    ].join('');

    const labels = stats.daily_signups.map((d) => d.day);
    const registered = stats.daily_signups.map((d) => d.registered_signups);
    const guests = stats.daily_signups.map((d) => d.guest_signups);

    if (signupsChart) signupsChart.destroy();
    signupsChart = new Chart(document.getElementById('signups-chart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'مسجّلون', data: registered, backgroundColor: '#4f6ef7', borderRadius: 4 },
          { label: 'زوار', data: guests, backgroundColor: '#f59e0b', borderRadius: 4 },
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

  function renderEngagement(stats) {
    document.getElementById('engagement-stats').innerHTML = [
      App.utils.statCard('✅', stats.completed_rooms, 'ألعاب مكتملة', true),
      App.utils.statCard('▶️', stats.in_progress_rooms, 'ألعاب جارية'),
      App.utils.statCard('🕐', stats.waiting_rooms, 'غرف في الانتظار'),
      App.utils.statCard('🔁', stats.avg_rounds_per_room, 'متوسط الجولات لكل غرفة'),
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

  return { init, load, invalidate };
})();
