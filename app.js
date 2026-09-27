

const Store = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`Pulse: could not read "${key}", using fallback.`, err);
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`Pulse: could not save "${key}".`, err);
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (err) {  }
  }
};

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const Auth = {
  USERS_KEY: 'pulse_users',
  SESSION_KEY: 'pulse_session',

  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  },

  isValidEmailAddress(email) {
    const normEmail = this.normalizeEmail(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normEmail);
  },

  isValidName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return false;


    if (/^\d+$/.test(trimmed.replace(/\s/g, ''))) return false;


    const namePattern = /^[A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*)*$/;
    return namePattern.test(trimmed) && /[A-Za-z]/.test(trimmed);
  },

  getUsers() {
    return Store.read(this.USERS_KEY, []);
  },

  saveUsers(users) {
    return Store.write(this.USERS_KEY, users);
  },

  register(name, email, password) {
    const rawName = String(name || '').trim();
    const normEmail = this.normalizeEmail(email);
    password = String(password || '');

    if (!rawName) {
      return { ok: false, error: 'Please enter your name.' };
    }
    if (!this.isValidName(rawName)) {
      return { ok: false, error: 'Please enter a valid name using letters only (for example: Aayush).' };
    }
    if (!this.isValidEmailAddress(normEmail)) {
      return { ok: false, error: 'Please enter a valid email address such as example@gmail.com.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const users = this.getUsers();
    if (users.some(u => u.email === normEmail)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    const user = {
      id: makeId('user'),
      name: rawName,
      email: normEmail,
      passwordDemo: password,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    if (!this.saveUsers(users)) {
      return { ok: false, error: 'Could not save your account. Storage may be full.' };
    }
    this.startSession(user, 'register');
    return { ok: true, user };
  },

  login(email, password) {
    const normEmail = this.normalizeEmail(email);
    password = String(password || '');
    const users = this.getUsers();
    const user = users.find(u => u.email === normEmail);
    if (!user || user.passwordDemo !== password) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    this.startSession(user, 'login');
    return { ok: true, user };
  },

  startSession(user, entrySource = 'login') {
    Store.write(this.SESSION_KEY, { userId: user.id, name: user.name, email: user.email, entrySource });
  },

  logout() {
    Store.remove(this.SESSION_KEY);
  },

  getSession() {
    return Store.read(this.SESSION_KEY, null);
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    const users = this.getUsers();
    return users.find(u => u.id === session.userId) || null;
  },

  requireAuth() {
    const session = this.getSession();
    if (!session) {
      window.location.href = 'index.html#auth';
      return null;
    }
    return session;
  }
};

const Icons = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M2 9v6M22 9v6M4 12h16"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.2 2"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s-6 6.5-6 11a6 6 0 0 0 12 0c0-2-1-3.5-2-4.5.3 1.5-.5 2.5-1.3 2.2C15.6 10 15 8 12 2Z"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M8 13a4 4 0 0 0 8 0"/><path d="M9 9h.01M15 9h.01"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-4 4-3-3-6 6"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z"/></svg>',
  salad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 18 0"/><path d="M3 12h18M12 12V5M9 5c0-1.5 1.5-2 3-2s3 .5 3 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>'
};
function icon(name) { return Icons[name] || ''; }

function ensureToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    document.body.appendChild(c);
  }
  return c;
}
function showToast(message, type = 'success') {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast-error' : type === 'warning' ? ' toast-warning' : ''}`;
  toast.setAttribute('role', 'alert');
  const badge = type === 'error' ? '!' : type === 'warning' ? '!' : icon('check');
  toast.innerHTML = `<span class="pulse-icon toast-icon">${type === 'success' ? icon('check') : '⚠'}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }




  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const raw = a.getAttribute('href');
    if (raw.includes('#')) return;
    if (raw === path) a.classList.add('active');
  });


  const session = Auth.getSession();
  const signinBtn = document.querySelector('.btn-nav-signin');
  const logoutBtn = document.querySelector('.btn-nav-logout');
  const usernameEl = document.querySelector('.nav-username');

  if (session) {
    if (signinBtn) signinBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (usernameEl) {
      usernameEl.textContent = session.name;
      usernameEl.style.display = 'inline';
    }
  } else {
    if (signinBtn) signinBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (usernameEl) usernameEl.style.display = 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.href = 'index.html';
    });
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

document.addEventListener('DOMContentLoaded', initNav);

function currentUserId() {
  const session = Auth.getSession();
  return session ? session.userId : null;
}

const ProfileDB = {
  key(uid) { return `pulse_profile_${uid}`; },
  get(uid) { return Store.read(this.key(uid), null); },
  save(uid, profile) {
    profile.updatedAt = new Date().toISOString();
    return Store.write(this.key(uid), profile);
  }
};

const GoalDB = {
  key(uid) { return `pulse_goals_${uid}`; },
  get(uid) { return Store.read(this.key(uid), []); },
  add(uid, goal) {
    const goals = this.get(uid);
    goals.push({ ...goal, createdAt: new Date().toISOString() });
    return Store.write(this.key(uid), goals);
  }
};

const WorkoutDB = {
  key(uid) { return `pulse_workouts_${uid}`; },
  getAll(uid) { return Store.read(this.key(uid), []); },
  add(uid, workout) {
    const list = this.getAll(uid);
    const record = { id: makeId('wk'), createdAt: new Date().toISOString(), ...workout };
    list.push(record);
    Store.write(this.key(uid), list);
    return record;
  },
  remove(uid, id) {
    const list = this.getAll(uid).filter(w => w.id !== id);
    return Store.write(this.key(uid), list);
  }
};

const MeasurementDB = {
  key(uid) { return `pulse_measurements_${uid}`; },
  getAll(uid) { return Store.read(this.key(uid), []); },
  add(uid, measurement) {
    const list = this.getAll(uid);
    const record = { id: makeId('ms'), createdAt: new Date().toISOString(), ...measurement };
    list.push(record);
    Store.write(this.key(uid), list);
    return record;
  }
};

const WorkoutStats = {
  totalWorkouts(list) { return list.length; },
  totalMinutes(list) { return list.reduce((sum, w) => sum + (Number(w.durationMinutes) || 0), 0); },
  averageDuration(list) {
    if (!list.length) return 0;
    return Math.round(this.totalMinutes(list) / list.length);
  },
  bestDuration(list) {
    if (!list.length) return 0;
    return Math.max(...list.map(w => Number(w.durationMinutes) || 0));
  },
  thisWeekCount(list) {
    const { start, end } = this.currentWeekRange();
    return list.filter(w => {
      const d = new Date(w.date);
      return d >= start && d <= end;
    }).length;
  },
  currentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(now);
    start.setDate(now.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  },
  currentStreak(list) {
    if (!list.length) return 0;
    const days = new Set(list.map(w => w.date));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (true) {
      const iso = cursor.toISOString().slice(0, 10);
      if (days.has(iso)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (streak === 0 && iso === new Date().toISOString().slice(0, 10)) {

        cursor.setDate(cursor.getDate() - 1);
        const yIso = cursor.toISOString().slice(0, 10);
        if (days.has(yIso)) { continue; }
        break;
      } else {
        break;
      }
    }
    return streak;
  },
  filterByRange(list, range) {
    if (range === 'all') return list;
    const now = new Date();
    let start;
    if (range === 'week') {
      start = this.currentWeekRange().start;
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      return list;
    }
    return list.filter(w => new Date(w.date) >= start);
  }
};

function computeBMI(weightKg, heightCm) {
  const w = Number(weightKg), h = Number(heightCm) / 100;
  if (!w || !h) return null;
  return +(w / (h * h)).toFixed(1);
}
function bmiCategory(bmi) {
  if (bmi === null) return { label: '—', cls: '' };
  if (bmi < 18.5) return { label: 'Underweight', cls: 'bmi-under' };
  if (bmi < 25) return { label: 'Normal range', cls: 'bmi-normal' };
  if (bmi < 30) return { label: 'Overweight', cls: 'bmi-over' };
  return { label: 'Obesity range', cls: 'bmi-obese' };
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

function estimateNutrition(profile) {
  if (!profile || !profile.weightKg || !profile.heightCm || !profile.age) return null;

  const w = Number(profile.weightKg), h = Number(profile.heightCm), a = Number(profile.age);
  let bmr;
  if (profile.sexForCalorieEstimate === 'male') {
    bmr = 10 * w + 6.25 * h - 5 * a + 5;
  } else if (profile.sexForCalorieEstimate === 'female') {
    bmr = 10 * w + 6.25 * h - 5 * a - 161;
  } else {

    const male = 10 * w + 6.25 * h - 5 * a + 5;
    const female = 10 * w + 6.25 * h - 5 * a - 161;
    bmr = (male + female) / 2;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.375;
  let calories = bmr * multiplier;

  let direction = 'Maintenance';
  if (profile.primaryGoal === 'weight_loss') { calories -= 350; direction = 'Modest estimated deficit for weight loss'; }
  else if (profile.primaryGoal === 'muscle_building') { calories += 300; direction = 'Modest estimated surplus for muscle gain'; }
  else { direction = 'Estimated maintenance for general fitness'; }

  calories = Math.round(calories / 10) * 10;
  const proteinG = Math.round(w * (profile.primaryGoal === 'muscle_building' ? 1.9 : 1.6));
  const fatG = Math.round((calories * 0.28) / 9);
  const carbG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);

  return {
    calories, proteinG, carbG, fatG, direction,
    approximate: !profile.sexForCalorieEstimate || profile.sexForCalorieEstimate === 'prefer_not_to_say'
  };
}

const EQUIPMENT_MOVES = {
  none: { push: 'Push-ups', pull: 'Inverted rows (table/bar)', squat: 'Bodyweight squats', hinge: 'Glute bridges', core: 'Plank' },
  basic: { push: 'Dumbbell press', pull: 'Resistance-band rows', squat: 'Dumbbell goblet squats', hinge: 'Dumbbell deadlifts', core: 'Weighted plank' },
  gym: { push: 'Barbell bench press', pull: 'Lat pulldown', squat: 'Barbell back squat', hinge: 'Romanian deadlift', core: 'Cable crunch' }
};

const GOAL_FOCUS = {
  weight_loss: { label: 'Weight Loss', cardioBias: 0.5, strengthBias: 0.35, mobilityBias: 0.15 },
  muscle_building: { label: 'Muscle Building', cardioBias: 0.1, strengthBias: 0.75, mobilityBias: 0.15 },
  strength: { label: 'Strength', cardioBias: 0.1, strengthBias: 0.8, mobilityBias: 0.1 },
  cardio: { label: 'Cardio & Endurance', cardioBias: 0.75, strengthBias: 0.1, mobilityBias: 0.15 },
  flexibility: { label: 'Flexibility', cardioBias: 0.15, strengthBias: 0.15, mobilityBias: 0.7 },
  general_fitness: { label: 'General Fitness', cardioBias: 0.35, strengthBias: 0.35, mobilityBias: 0.3 },
  consistency: { label: 'Consistency', cardioBias: 0.3, strengthBias: 0.3, mobilityBias: 0.4 }
};

function generatePlan(profile) {
  if (!profile) return null;
  const goal = GOAL_FOCUS[profile.primaryGoal] || GOAL_FOCUS.general_fitness;
  const equipment = EQUIPMENT_MOVES[profile.equipment] || EQUIPMENT_MOVES.none;
  const experience = profile.experienceLevel || 'beginner';
  const trainingDays = Math.min(6, Math.max(1, Number(profile.trainingDays) || 3));

  const setsReps = experience === 'beginner' ? '2 x 10' : experience === 'intermediate' ? '3 x 10' : '4 x 8';
  const cardioMin = experience === 'beginner' ? 20 : experience === 'intermediate' ? 30 : 40;


  const typeOrder = [];
  const weights = { strength: goal.strengthBias, cardio: goal.cardioBias, mobility: goal.mobilityBias };
  const sortedTypes = Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  for (let i = 0; i < trainingDays; i++) {
    typeOrder.push(sortedTypes[i % sortedTypes.length]);
  }

  for (let i = 2; i < typeOrder.length; i++) {
    if (typeOrder[i] === 'strength' && typeOrder[i - 1] === 'strength' && typeOrder[i - 2] === 'strength') {
      typeOrder[i] = typeOrder[i] === sortedTypes[0] ? sortedTypes[1] : sortedTypes[0];
    }
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const schedule = [];


  const spread = spreadDaysAcrossWeek(trainingDays);
  let ti = 0;
  for (let d = 0; d < 7; d++) {
    if (spread.includes(d)) {
      const type = typeOrder[ti % typeOrder.length];
      schedule.push(buildDay(dayNames[d], type, equipment, setsReps, cardioMin));
      ti++;
    } else {
      schedule.push({ day: dayNames[d], isTraining: false, focus: 'Rest / Recovery', exercises: [] });
    }
  }

  return {
    goalLabel: goal.label,
    experience,
    trainingDays,
    schedule
  };
}

function spreadDaysAcrossWeek(n) {

  if (n >= 7) return [0, 1, 2, 3, 4, 5, 6];
  const days = [];
  const step = 7 / n;
  for (let i = 0; i < n; i++) days.push(Math.round(i * step));
  return [...new Set(days)];
}

function buildDay(dayName, type, equipment, setsReps, cardioMin) {
  if (type === 'strength') {
    return {
      day: dayName, isTraining: true, focus: 'Strength',
      exercises: [
        { name: equipment.squat, sets: setsReps },
        { name: equipment.push, sets: setsReps },
        { name: equipment.pull, sets: setsReps },
        { name: equipment.hinge, sets: setsReps },
        { name: equipment.core, sets: '2 x 30s' }
      ]
    };
  }
  if (type === 'cardio') {
    return {
      day: dayName, isTraining: true, focus: 'Cardio',
      exercises: [{ name: 'Walking, jogging, or cycling', sets: `${cardioMin} min` }]
    };
  }
  return {
    day: dayName, isTraining: true, focus: 'Mobility & Recovery',
    exercises: [
      { name: 'Full-body stretching flow', sets: '15 min' },
      { name: 'Hip and shoulder mobility drills', sets: '10 min' }
    ]
  };
}