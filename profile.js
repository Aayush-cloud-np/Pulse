

let CURRENT_UID = null;

document.addEventListener('DOMContentLoaded', () => {
  const session = Auth.requireAuth();
  if (!session) return;
  CURRENT_UID = session.userId;

  document.getElementById('icon-total-workouts').innerHTML = icon('dumbbell');
  document.getElementById('icon-total-minutes').innerHTML = icon('clock');
  document.getElementById('icon-streak').innerHTML = icon('flame');
  document.getElementById('icon-weight').innerHTML = icon('scale');

  const profile = ProfileDB.get(CURRENT_UID);
  if (!profile) {
    showOnboarding();
  } else {
    showDashboard(profile);
  }

  wireOnboardingForm();
  wireEditModal();
});

function showOnboarding() {
  document.getElementById('onboarding-view').classList.remove('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');
}

function validateProfileFields(values, prefix) {
  const errors = {};
  if (!values.age || values.age < 13 || values.age > 100) errors.age = 'Enter an age between 13 and 100.';
  if (!values.heightCm || values.heightCm < 100 || values.heightCm > 250) errors.height = 'Enter a height between 100 and 250 cm.';
  if (!values.weightKg || values.weightKg < 30 || values.weightKg > 300) errors.weight = 'Enter a weight between 30 and 300 kg.';
  if (!values.trainingDays || values.trainingDays < 1 || values.trainingDays > 7) errors['training-days'] = 'Choose between 1 and 7 days.';
  if (!values.primaryGoal) errors['primary-goal'] = 'Please select a primary goal.';

  Object.keys(errors).forEach(field => {
    const el = document.getElementById(`${prefix}-${field}-error`);
    if (el) el.textContent = errors[field];
  });
  ['age', 'height', 'weight', 'training-days', 'primary-goal'].forEach(field => {
    if (!errors[field]) {
      const el = document.getElementById(`${prefix}-${field}-error`);
      if (el) el.textContent = '';
    }
  });
  return Object.keys(errors).length === 0;
}

function wireOnboardingForm() {
  const form = document.getElementById('onboarding-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {
      age: Number(document.getElementById('ob-age').value),
      heightCm: Number(document.getElementById('ob-height').value),
      weightKg: Number(document.getElementById('ob-weight').value),
      sexForCalorieEstimate: document.getElementById('ob-sex').value,
      activityLevel: document.getElementById('ob-activity').value,
      experienceLevel: document.getElementById('ob-experience').value,
      primaryGoal: document.getElementById('ob-primary-goal').value,
      secondaryGoal: document.getElementById('ob-secondary-goal').value || null,
      trainingDays: Number(document.getElementById('ob-training-days').value),
      equipment: document.getElementById('ob-equipment').value
    };

    if (!validateProfileFields(values, 'ob')) return;

    if (!ProfileDB.save(CURRENT_UID, values)) {
      const msg = document.getElementById('onboarding-msg');
      msg.textContent = 'Could not save your profile — storage may be unavailable.';
      msg.className = 'auth-msg show error';
      return;
    }
    showToast('Profile saved!');
    showDashboard(values);
  });
}

function showDashboard(profile) {
  document.getElementById('onboarding-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');

  const session = Auth.getSession();
  const entrySource = session && session.entrySource === 'register' ? 'register' : 'login';
  const isFirstEntry = entrySource === 'register';

  const user = Auth.getCurrentUser();
  const firstName = user ? user.name.split(' ')[0] : 'there';
  document.getElementById('dash-greeting').textContent = isFirstEntry
    ? `Welcome, ${firstName}`
    : `Welcome back, ${firstName}`;

  const workouts = WorkoutDB.getAll(CURRENT_UID);
  const measurements = MeasurementDB.getAll(CURRENT_UID);

  renderStats(workouts, measurements, profile);
  renderGoal(workouts);
  renderPlan(profile);
  renderRecentWorkouts(workouts);
  renderProfileSummary(profile);
  renderNutrition(profile);
}

function renderStats(workouts, measurements, profile) {
  document.getElementById('stat-total-workouts').textContent = WorkoutStats.totalWorkouts(workouts);
  document.getElementById('stat-total-minutes').textContent = WorkoutStats.totalMinutes(workouts);
  document.getElementById('stat-streak').textContent = WorkoutStats.currentStreak(workouts);

  let weightLabel = '—';
  if (measurements.length) {
    const latest = [...measurements].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    weightLabel = `${latest.weightKg} kg`;
  } else if (profile && profile.weightKg) {
    weightLabel = `${profile.weightKg} kg`;
  }
  document.getElementById('stat-weight').textContent = weightLabel;
}

function renderGoal(workouts) {
  const target = 4;
  const completed = Math.min(target, WorkoutStats.thisWeekCount(workouts));
  const pct = Math.round((completed / target) * 100);

  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (pct / 100) * circumference;
  const ring = document.getElementById('goal-ring-fill');
  ring.setAttribute('stroke-dasharray', circumference.toFixed(1));
  ring.setAttribute('stroke-dashoffset', offset.toFixed(1));
  document.getElementById('goal-ring-label').textContent = `${pct}%`;
  document.getElementById('goal-info-desc').textContent =
    `${completed} of ${target} workouts completed this week.`;
}

function renderPlan(profile) {
  const plan = generatePlan(profile);
  const container = document.getElementById('plan-summary');
  if (!plan) { container.innerHTML = ''; return; }

  container.innerHTML = plan.schedule.map(day => {
    if (!day.isTraining) {
      return `<div class="week-day-card">
        <div class="week-day-head"><span class="week-day-name">${escapeHTML(day.day)}</span><span class="week-day-focus">${escapeHTML(day.focus)}</span></div>
      </div>`;
    }
    const exercises = day.exercises.map(ex =>
      `<li><span>${escapeHTML(ex.name)}</span><span class="ex-sets">${escapeHTML(ex.sets)}</span></li>`
    ).join('');
    return `<div class="week-day-card">
      <div class="week-day-head"><span class="week-day-name">${escapeHTML(day.day)}</span><span class="week-day-focus">${escapeHTML(day.focus)}</span></div>
      <ul class="week-exercise-list">${exercises}</ul>
    </div>`;
  }).join('');
}

function renderRecentWorkouts(workouts) {
  const container = document.getElementById('recent-workouts');
  const recent = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (!recent.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="pulse-icon empty-icon">${icon('empty')}</span>
      <p>No workouts logged yet. Head to the Workout page to log your first session.</p>
    </div>`;
    return;
  }

  container.innerHTML = recent.map(w => `
    <div class="recent-row">
      <span class="pulse-icon recent-icon">${icon('dumbbell')}</span>
      <div class="recent-main">
        <div class="recent-type">${escapeHTML(w.type)}</div>
        <div class="recent-meta">${escapeHTML(w.date)}${w.sets ? ` · ${escapeHTML(String(w.sets))} sets` : ''}${w.repetitions ? ` × ${escapeHTML(String(w.repetitions))} reps` : ''}${w.distanceKm ? ` · ${escapeHTML(String(w.distanceKm))} km` : ''}</div>
      </div>
      <div class="recent-duration">${escapeHTML(String(w.durationMinutes))} min</div>
    </div>
  `).join('');
}

function renderProfileSummary(profile) {
  const rows = [
    ['Age', `${profile.age}`],
    ['Height', `${profile.heightCm} cm`],
    ['Weight', `${profile.weightKg} kg`],
    ['Activity Level', formatLabel(profile.activityLevel)],
    ['Experience', formatLabel(profile.experienceLevel)],
    ['Primary Goal', formatLabel(profile.primaryGoal)],
    ['Training Days', `${profile.trainingDays} / week`],
    ['Equipment', formatLabel(profile.equipment)]
  ];
  document.getElementById('profile-summary').innerHTML = rows.map(([label, value]) =>
    `<div class="summary-row"><span class="label">${escapeHTML(label)}</span><span class="value">${escapeHTML(value)}</span></div>`
  ).join('');
}

function renderNutrition(profile) {
  const container = document.getElementById('nutrition-card-body');
  const estimate = estimateNutrition(profile);
  if (!estimate) {
    container.innerHTML = `<p class="text-muted">Complete your profile to see an estimated nutrition target.</p>`;
    return;
  }
  container.innerHTML = `
    <div class="nutri-grid">
      <div class="nutri-box"><div class="nutri-value">${estimate.calories}</div><div class="nutri-label">kcal / day</div></div>
      <div class="nutri-box"><div class="nutri-value">${estimate.proteinG}g</div><div class="nutri-label">Protein</div></div>
      <div class="nutri-box"><div class="nutri-value">${estimate.carbG}g</div><div class="nutri-label">Carbs</div></div>
      <div class="nutri-box"><div class="nutri-value">${estimate.fatG}g</div><div class="nutri-label">Fat</div></div>
    </div>
    <p class="mt-16" style="font-size:0.85rem;color:var(--text-secondary);">${escapeHTML(estimate.direction)}${estimate.approximate ? ' — shown as a broader approximate range since sex was not provided.' : ''}</p>
    <p class="nutri-disclaimer">Nutrition values are general educational estimates, not medical advice. Individual needs vary. Consult a qualified professional for personalized guidance.</p>
  `;
}

function formatLabel(value) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function wireEditModal() {
  const modal = document.getElementById('edit-modal');
  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    const profile = ProfileDB.get(CURRENT_UID);
    if (!profile) return;
    document.getElementById('ed-age').value = profile.age;
    document.getElementById('ed-height').value = profile.heightCm;
    document.getElementById('ed-weight').value = profile.weightKg;
    document.getElementById('ed-sex').value = profile.sexForCalorieEstimate || 'prefer_not_to_say';
    document.getElementById('ed-activity').value = profile.activityLevel;
    document.getElementById('ed-experience').value = profile.experienceLevel;
    document.getElementById('ed-primary-goal').value = profile.primaryGoal;
    document.getElementById('ed-training-days').value = profile.trainingDays;
    document.getElementById('ed-equipment').value = profile.equipment;
    modal.classList.add('open');
  });
  document.getElementById('edit-cancel-btn').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

  document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {
      age: Number(document.getElementById('ed-age').value),
      heightCm: Number(document.getElementById('ed-height').value),
      weightKg: Number(document.getElementById('ed-weight').value),
      sexForCalorieEstimate: document.getElementById('ed-sex').value,
      activityLevel: document.getElementById('ed-activity').value,
      experienceLevel: document.getElementById('ed-experience').value,
      primaryGoal: document.getElementById('ed-primary-goal').value,
      secondaryGoal: ProfileDB.get(CURRENT_UID)?.secondaryGoal || null,
      trainingDays: Number(document.getElementById('ed-training-days').value),
      equipment: document.getElementById('ed-equipment').value
    };
    if (!values.age || values.age < 13 || values.age > 100) return showToast('Enter a valid age (13–100).', 'error');
    if (!values.heightCm || values.heightCm < 100 || values.heightCm > 250) return showToast('Enter a valid height (100–250cm).', 'error');
    if (!values.weightKg || values.weightKg < 30 || values.weightKg > 300) return showToast('Enter a valid weight (30–300kg).', 'error');
    if (!values.trainingDays || values.trainingDays < 1 || values.trainingDays > 7) return showToast('Training days must be 1–7.', 'error');

    ProfileDB.save(CURRENT_UID, values);
    modal.classList.remove('open');
    showToast('Profile updated.');
    showDashboard(values);
  });
}