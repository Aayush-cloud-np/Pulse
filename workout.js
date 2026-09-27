

let WK_UID = null;
let pendingDeleteId = null;
let currentSort = 'newest';

document.addEventListener('DOMContentLoaded', () => {
  const session = Auth.requireAuth();
  if (!session) return;
  WK_UID = session.userId;

  document.getElementById('wk-date').setAttribute('max', new Date().toISOString().slice(0, 10));

  wireWorkoutForm();
  wireSort();
  wireDeleteModal();
  renderHistory();
  loadLibrary();
});

function clearWkErrors() {
  ['type', 'date', 'duration', 'sets', 'reps', 'distance'].forEach(f => {
    const el = document.getElementById(`wk-${f}-error`);
    if (el) el.textContent = '';
  });
}

function wireWorkoutForm() {
  const form = document.getElementById('workout-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearWkErrors();

    const type = document.getElementById('wk-type').value;
    const date = document.getElementById('wk-date').value;
    const duration = document.getElementById('wk-duration').value;
    const sets = document.getElementById('wk-sets').value;
    const reps = document.getElementById('wk-reps').value;
    const distance = document.getElementById('wk-distance').value;
    const notes = document.getElementById('wk-notes').value;

    let valid = true;
    if (!type) { setErr('wk-type-error', 'Please choose a workout type.'); valid = false; }
    if (!date) { setErr('wk-date-error', 'Please choose a date.'); valid = false; }
    else if (new Date(date) > new Date(new Date().toDateString())) {
      setErr('wk-date-error', 'Date cannot be in the future.'); valid = false;
    }
    const durNum = Number(duration);
    if (!duration || !Number.isInteger(durNum) || durNum < 1 || durNum > 600) {
      setErr('wk-duration-error', 'Enter a whole number of minutes between 1 and 600.'); valid = false;
    }
    if (sets && (Number(sets) < 1 || Number(sets) > 50)) { setErr('wk-sets-error', 'Sets must be between 1 and 50.'); valid = false; }
    if (reps && (Number(reps) < 1 || Number(reps) > 200)) { setErr('wk-reps-error', 'Repetitions must be between 1 and 200.'); valid = false; }
    if (distance && (Number(distance) <= 0 || Number(distance) > 500)) { setErr('wk-distance-error', 'Distance must be a positive number up to 500km.'); valid = false; }

    if (!valid) return;

    WorkoutDB.add(WK_UID, {
      type, date,
      durationMinutes: durNum,
      sets: sets ? Number(sets) : null,
      repetitions: reps ? Number(reps) : null,
      distanceKm: distance ? Number(distance) : null,
      notes: notes ? notes.trim() : ''
    });

    showToast('Workout saved!');
    form.reset();
    renderHistory();
  });
}

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function wireSort() {
  document.getElementById('wk-sort').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderHistory();
  });
}

function sortWorkouts(list) {
  const copy = [...list];
  if (currentSort === 'newest') return copy.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (currentSort === 'oldest') return copy.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (currentSort === 'duration') return copy.sort((a, b) => b.durationMinutes - a.durationMinutes);
  return copy;
}

function renderHistory() {
  const list = WorkoutDB.getAll(WK_UID);
  const container = document.getElementById('workout-history');

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="pulse-icon empty-icon">${icon('empty')}</span>
      <p>No workouts yet. Use the form above to log your first session.</p>
    </div>`;
    return;
  }

  const sorted = sortWorkouts(list);
  container.innerHTML = sorted.map(w => `
    <div class="wk-row" data-id="${w.id}">
      <span class="pulse-icon wk-row-icon">${icon('dumbbell')}</span>
      <div class="wk-row-main">
        <div class="wk-row-type">${escapeHTML(w.type)}</div>
        <div class="wk-row-meta">
          <span>${escapeHTML(w.date)}</span>
          ${w.sets ? `<span>${escapeHTML(String(w.sets))} sets</span>` : ''}
          ${w.repetitions ? `<span>${escapeHTML(String(w.repetitions))} reps</span>` : ''}
          ${w.distanceKm ? `<span>${escapeHTML(String(w.distanceKm))} km</span>` : ''}
        </div>
        ${w.notes ? `<div class="wk-row-notes">${escapeHTML(w.notes)}</div>` : ''}
      </div>
      <div class="wk-row-duration">${escapeHTML(String(w.durationMinutes))} min</div>
      <button type="button" class="wk-row-delete" data-id="${w.id}" aria-label="Delete this workout">
        <span class="pulse-icon">${icon('trash')}</span>
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.wk-row-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
}

function wireDeleteModal() {
  const modal = document.getElementById('delete-modal');
  document.getElementById('delete-cancel-btn').addEventListener('click', () => { modal.classList.remove('open'); pendingDeleteId = null; });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('open'); pendingDeleteId = null; } });
  document.getElementById('delete-confirm-btn').addEventListener('click', () => {
    if (pendingDeleteId) {
      WorkoutDB.remove(WK_UID, pendingDeleteId);
      showToast('Workout deleted.');
      renderHistory();
    }
    modal.classList.remove('open');
    pendingDeleteId = null;
  });
}

function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('delete-modal').classList.add('open');
}

async function loadLibrary() {
  const container = document.getElementById('workout-library');
  try {
    const res = await fetch('data/workouts.json');
    if (!res.ok) throw new Error('Network response was not OK');
    const items = await res.json();
    renderLibrary(items);
    renderSpotlight(items);
  } catch (err) {
    console.warn('Pulse: failed to load workout library.', err);
    container.innerHTML = `<div class="empty-state">
      <span class="pulse-icon empty-icon">${icon('alert')}</span>
      <p>Couldn't load the workout library right now. Check your connection and refresh the page.</p>
    </div>`;
  }
}

function renderLibrary(items) {
  const container = document.getElementById('workout-library');
  container.innerHTML = items.map(item => `
    <div class="lib-card">
      <span class="lib-diff">${escapeHTML(item.difficulty)}</span>
      <h4>${escapeHTML(item.name)}</h4>
      <p>${escapeHTML(item.description)}</p>
    </div>
  `).join('');
}

function renderSpotlight(items) {

  const byCategory = {};
  items.forEach(i => { if (!byCategory[i.category]) byCategory[i.category] = []; byCategory[i.category].push(i); });
  const categories = Object.keys(byCategory);
  const tones = ['tone-1', 'tone-2', 'tone-3', 'tone-4'];

  const $track = $('#lib-gallery-track');
  const $dots = $('#lib-gallery-dots');
  $track.empty();
  $dots.empty();

  categories.forEach((cat, i) => {
    const example = byCategory[cat][0];
    const $slide = $(`
      <div class="gallery-slide ${tones[i % tones.length]}" aria-hidden="${i === 0 ? 'false' : 'true'}">
        <div class="slide-tag">${escapeHTML(cat)}</div>
        <h3>${escapeHTML(example.name)}</h3>
        <p>${escapeHTML(example.description)}</p>
      </div>
    `);
    if (i === 0) $slide.addClass('active');
    $track.append($slide);

    const $dot = $('<button type="button" class="gallery-dot" role="tab"></button>')
      .attr('aria-label', `Go to ${cat} slide`)
      .attr('aria-selected', i === 0 ? 'true' : 'false')
      .toggleClass('active', i === 0);
    $dots.append($dot);
  });

  let current = 0;
  const $slides = $track.children('.gallery-slide');

  function goTo(index) {
    const total = $slides.length;
    current = (index + total) % total;
    $slides.removeClass('active').attr('aria-hidden', 'true');
    $slides.eq(current).addClass('active').attr('aria-hidden', 'false');
    $dots.children().removeClass('active').attr('aria-selected', 'false');
    $dots.children().eq(current).addClass('active').attr('aria-selected', 'true');
  }

  $dots.children().each(function (i) { $(this).on('click', () => goTo(i)); });
  $('.wk-wrap .gallery-nav.next').off('click').on('click', () => goTo(current + 1));
  $('.wk-wrap .gallery-nav.prev').off('click').on('click', () => goTo(current - 1));
}