

let PG_UID = null;
let durationChart = null;
let weightChart = null;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  const session = Auth.requireAuth();
  if (!session) return;
  PG_UID = session.userId;

  document.getElementById('ms-date').setAttribute('max', new Date().toISOString().slice(0, 10));

  document.getElementById('pg-filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderDurationChart();
  });

  wireMeasurementForm();

  renderDurationChart();
  renderGoal();
  renderWeightSection();
});

function renderDurationChart() {
  const all = WorkoutDB.getAll(PG_UID);
  const filtered = WorkoutStats.filterByRange(all, currentFilter);
  const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

  document.getElementById('pg-total-workouts').textContent = WorkoutStats.totalWorkouts(filtered);
  document.getElementById('pg-total-minutes').textContent = WorkoutStats.totalMinutes(filtered);
  document.getElementById('pg-avg-duration').textContent = WorkoutStats.averageDuration(filtered);
  document.getElementById('pg-best-duration').textContent = WorkoutStats.bestDuration(filtered);

  const canvasWrap = document.querySelector('.pg-chart-wrap');
  const emptyState = document.getElementById('chart-empty');
  const tableWrap = document.getElementById('chart-table');

  if (!sorted.length) {
    canvasWrap.style.display = 'none';
    emptyState.classList.remove('hidden');
    tableWrap.innerHTML = '';
    if (durationChart) { durationChart.destroy(); durationChart = null; }
    return;
  }

  canvasWrap.style.display = 'block';
  emptyState.classList.add('hidden');

  const labels = sorted.map(w => w.date);
  const data = sorted.map(w => w.durationMinutes);

  if (durationChart) { durationChart.destroy(); durationChart = null; }
  const ctx = document.getElementById('duration-chart').getContext('2d');
  durationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Duration (minutes)',
        data,
        backgroundColor: 'rgba(34,211,238,0.55)',
        borderColor: 'rgba(34,211,238,1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9c9c9c', maxRotation: 45, minRotation: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { beginAtZero: true, title: { display: true, text: 'Minutes', color: '#9c9c9c' }, ticks: { color: '#9c9c9c' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });


  tableWrap.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
      <thead><tr style="text-align:left;color:var(--text-muted);">
        <th style="padding:8px;">Date</th><th style="padding:8px;">Type</th><th style="padding:8px;">Duration (min)</th>
      </tr></thead>
      <tbody>
        ${sorted.map(w => `<tr style="border-top:1px solid var(--border);">
          <td style="padding:8px;">${escapeHTML(w.date)}</td>
          <td style="padding:8px;">${escapeHTML(w.type)}</td>
          <td style="padding:8px;">${escapeHTML(String(w.durationMinutes))}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
}

function renderGoal() {
  const all = WorkoutDB.getAll(PG_UID);
  const target = 4;
  const completed = Math.min(target, WorkoutStats.thisWeekCount(all));
  const pct = Math.round((completed / target) * 100);
  document.getElementById('pg-goal-value').textContent = `${completed} / ${target} (${pct}%)`;
  document.getElementById('pg-goal-bar').style.width = `${pct}%`;
}

function wireMeasurementForm() {
  document.getElementById('measurement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('ms-date').value;
    const weight = document.getElementById('ms-weight').value;
    const notes = document.getElementById('ms-notes').value;
    const errEl = document.getElementById('ms-error');
    errEl.textContent = '';

    if (!date) { errEl.textContent = 'Please choose a date.'; return; }
    if (new Date(date) > new Date(new Date().toDateString())) { errEl.textContent = 'Date cannot be in the future.'; return; }
    const w = Number(weight);
    if (!weight || w < 30 || w > 300) { errEl.textContent = 'Enter a weight between 30 and 300 kg.'; return; }

    const profile = ProfileDB.get(PG_UID);
    const bmi = profile ? computeBMI(w, profile.heightCm) : null;

    MeasurementDB.add(PG_UID, { date, weightKg: w, bmi, notes: notes ? notes.trim() : '' });
    showToast('Measurement added.');
    document.getElementById('measurement-form').reset();
    document.getElementById('ms-date').setAttribute('max', new Date().toISOString().slice(0, 10));
    renderWeightSection();
  });
}

function renderWeightSection() {
  const measurements = [...MeasurementDB.getAll(PG_UID)].sort((a, b) => new Date(a.date) - new Date(b.date));
  const chartWrap = document.querySelector('#weight-chart').closest('.pg-chart-wrap');
  const emptyState = document.getElementById('weight-chart-empty');

  if (measurements.length < 2) {
    chartWrap.style.display = 'none';
    emptyState.classList.remove('hidden');
    if (weightChart) { weightChart.destroy(); weightChart = null; }
  } else {
    chartWrap.style.display = 'block';
    emptyState.classList.add('hidden');
    if (weightChart) { weightChart.destroy(); weightChart = null; }
    const ctx = document.getElementById('weight-chart').getContext('2d');
    weightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: measurements.map(m => m.date),
        datasets: [{
          label: 'Weight (kg)',
          data: measurements.map(m => m.weightKg),
          borderColor: 'rgba(34,211,238,1)',
          backgroundColor: 'rgba(34,211,238,0.15)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: 'rgba(34,211,238,1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9c9c9c' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#9c9c9c' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  renderBMI(measurements);
}

function renderBMI(measurements) {
  const container = document.getElementById('bmi-body');
  const profile = ProfileDB.get(PG_UID);

  if (!measurements.length || !profile) {
    container.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">Add a measurement (with a profile height set) to see your BMI.</p>`;
    return;
  }

  const latest = measurements[measurements.length - 1];
  const bmi = computeBMI(latest.weightKg, profile.heightCm);
  const cat = bmiCategory(bmi);

  const history = measurements.slice(-5).reverse().map(m => {
    const b = computeBMI(m.weightKg, profile.heightCm);
    return `<div class="summary-row"><span class="label">${escapeHTML(m.date)}</span><span class="value">${b !== null ? b : '—'}</span></div>`;
  }).join('');

  container.innerHTML = `
    <div class="flex" style="align-items:center;gap:14px;margin-bottom:14px;">
      <div class="stat-value" style="font-size:1.8rem;">${bmi !== null ? bmi : '—'}</div>
      <span class="bmi-badge ${cat.cls}">${escapeHTML(cat.label)}</span>
    </div>
    <div class="profile-summary">${history}</div>
    <p class="nutri-disclaimer">BMI is a general screening measure based on height and weight only. It is not a diagnosis and does not fully capture body composition or overall fitness.</p>
  `;
}