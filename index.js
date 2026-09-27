

function setFieldError(inputId, message) {
  const el = document.getElementById(`${inputId}-error`);
  if (el) el.textContent = message || '';
}

function showAuthMsg(panelPrefix, message, type) {
  const el = document.getElementById(`${panelPrefix}-msg`);
  if (!el) return;
  el.textContent = message;
  el.className = `auth-msg show ${type}`;
}

function switchAuthTab(which) {
  const isSignin = which === 'signin';
  document.getElementById('tab-signin').classList.toggle('active', isSignin);
  document.getElementById('tab-signin').setAttribute('aria-selected', String(isSignin));
  document.getElementById('tab-register').classList.toggle('active', !isSignin);
  document.getElementById('tab-register').setAttribute('aria-selected', String(!isSignin));
  document.getElementById('panel-signin').classList.toggle('active', isSignin);
  document.getElementById('panel-register').classList.toggle('active', !isSignin);
  document.querySelector('.auth-tabs').classList.toggle('tab-register', !isSignin);
}

function initAuthForms() {



  document.getElementById('tab-signin').addEventListener('click', () => switchAuthTab('signin'));
  document.getElementById('tab-register').addEventListener('click', () => switchAuthTab('register'));

  const heroCta = document.getElementById('hero-cta-primary');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      if (Auth.getSession()) {

        window.location.href = 'profile.html';
      }
    });
  }


  const signinForm = document.getElementById('signin-form');
  signinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setFieldError('signin-email', '');
    setFieldError('signin-password', '');
    showAuthMsg('signin', '', '');

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    let valid = true;
    if (!email.trim()) { setFieldError('signin-email', 'Email is required.'); valid = false; }
    if (!password) { setFieldError('signin-password', 'Password is required.'); valid = false; }
    if (!valid) return;

    const result = Auth.login(email, password);
    if (!result.ok) {
      showAuthMsg('signin', result.error, 'error');
      return;
    }
    showAuthMsg('signin', 'Signed in — redirecting to your profile…', 'success');
    setTimeout(() => { window.location.href = 'profile.html'; }, 600);
  });


  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setFieldError('register-name', '');
    setFieldError('register-email', '');
    setFieldError('register-password', '');
    showAuthMsg('register', '', '');

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    let valid = true;

    if (!name.trim()) {
      setFieldError('register-name', 'Name is required.');
      valid = false;
    } else if (!Auth.isValidName(name)) {
      setFieldError('register-name', 'Enter a valid name using letters only, such as Aayush.');
      valid = false;
    }

    if (!email.trim()) {
      setFieldError('register-email', 'Email is required.');
      valid = false;
    } else if (!Auth.isValidEmailAddress(email)) {
      setFieldError('register-email', 'Enter a valid email address such as example@gmail.com.');
      valid = false;
    }

    if (!password) {
      setFieldError('register-password', 'Password is required.');
      valid = false;
    } else if (password.length < 6) {
      setFieldError('register-password', 'Use at least 6 characters.');
      valid = false;
    }

    if (!valid) {
      showAuthMsg('register', 'Please correct the highlighted account details.', 'error');
      return;
    }

    const result = Auth.register(name, email, password);
    if (!result.ok) {
      showAuthMsg('register', result.error, 'error');
      return;
    }
    showAuthMsg('register', 'Account created — redirecting to your profile…', 'success');
    setTimeout(() => { window.location.href = 'profile.html'; }, 600);
  });


  if (window.location.hash === '#register') switchAuthTab('register');
}

$(function () {
  const $slides = $('.gallery-slide');
  const $dotsWrap = $('#gallery-dots');
  let current = 0;
  let timer = null;

  $slides.each(function (i) {
    const $dot = $('<button type="button" class="gallery-dot" role="tab"></button>')
      .attr('aria-label', `Go to slide ${i + 1}`)
      .attr('aria-selected', i === 0 ? 'true' : 'false')
      .toggleClass('active', i === 0)
      .on('click', () => goTo(i));
    $dotsWrap.append($dot);
  });

  function goTo(index) {
    const total = $slides.length;
    current = (index + total) % total;
    $slides.removeClass('active').attr('aria-hidden', 'true');
    $slides.eq(current).addClass('active').attr('aria-hidden', 'false');
    $dotsWrap.children().removeClass('active').attr('aria-selected', 'false');
    $dotsWrap.children().eq(current).addClass('active').attr('aria-selected', 'true');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  $('.gallery-nav.next').on('click', () => { next(); restartTimer(); });
  $('.gallery-nav.prev').on('click', () => { prev(); restartTimer(); });


  $('.gallery-slider').on('keydown', (e) => {
    if (e.key === 'ArrowRight') { next(); restartTimer(); }
    if (e.key === 'ArrowLeft') { prev(); restartTimer(); }
  });

  function startTimer() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    timer = setInterval(next, 5000);
  }
  function restartTimer() {
    if (timer) clearInterval(timer);
    startTimer();
  }
  startTimer();
});