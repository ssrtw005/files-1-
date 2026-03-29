/* ============================================================
   BELLEZA — Shared JS (api.js)
   Подключай на каждой странице: <script src="js/api.js"></script>
   ============================================================ */

const API_BASE = '';  // '' = тот же сервер. Смени на 'http://localhost:3000' если фронт отдельно

/* ── Auth state ── */
let _token = localStorage.getItem('bz_token');
let _user  = (() => { try { return JSON.parse(localStorage.getItem('bz_user')); } catch { return null; } })();

function getToken()   { return _token; }
function getUser()    { return _user; }
function isLoggedIn() { return !!_token; }
function isAdmin()    { return _user?.role === 'admin'; }
function isClient()   { return _user?.role === 'client'; }

function saveAuth(token, user) {
  _token = token; _user = user;
  localStorage.setItem('bz_token', token);
  localStorage.setItem('bz_user', JSON.stringify(user));
}
function clearAuth() {
  _token = null; _user = null;
  localStorage.removeItem('bz_token');
  localStorage.removeItem('bz_user');
}

/* ── Fetch wrapper ── */
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ── Toast ── */
function toast(msg, type = '') {
  const container = document.getElementById('toasts') || (() => {
    const d = document.createElement('div'); d.id = 'toasts'; document.body.appendChild(d); return d;
  })();
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

/* ── Modal helpers ── */
function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }
function closeOnBackdrop(id) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
}

/* ── Format helpers ── */
function fmtPrice(v) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(t) { return (t || '').slice(0, 5); }
function initials(fio) { return (fio || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
function statusLabel(s) {
  return { pending: 'Ожидает', confirmed: 'Подтверждено', completed: 'Выполнено', cancelled: 'Отменено' }[s] || s;
}

/* ── Nav: sticky + active link + auth buttons ── */
function initNav() {
  // sticky
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 10));
    // mark active
    const cur = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a[data-page]').forEach(a => {
      if (a.dataset.page === cur) a.classList.add('active');
    });
  }
  // auth buttons
  renderNavAuth();
}

function renderNavAuth() {
  const slot = document.getElementById('nav-auth');
  if (!slot) return;
  if (_user) {
    const firstName = (_user.fio_client || '').split(' ')[1] || _user.fio_client || 'Клиент';
    slot.innerHTML = `
      <span class="nav-user-name">${firstName}</span>
      <a href="${isAdmin() ? 'admin.html' : 'cabinet.html'}" class="btn btn-outline btn-sm">Кабинет</a>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Выйти</button>`;
  } else {
    slot.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="openModal('loginModal')">Войти</button>
      <button class="btn btn-primary btn-sm" onclick="openModal('registerModal')">Регистрация</button>`;
  }
}

function logout() {
  clearAuth();
  toast('Вы вышли из аккаунта');
  setTimeout(() => location.href = 'index.html', 600);
}

function requireAuth(redirectTo = 'booking.html') {
  if (!isLoggedIn()) {
    sessionStorage.setItem('bz_redirect', redirectTo);
    openModal('loginModal');
    return false;
  }
  return true;
}

/* ── Login / Register modals (shared) ── */
async function doLogin() {
  const email    = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  if (!email || !password) { toast('Заполните все поля', 'err'); return; }
  try {
    const data = await api('/api/auth/login', 'POST', { email_client: email, password });
    saveAuth(data.token, data.user);
    toast(`Добро пожаловать! 🌸`, 'ok');
    closeModal('loginModal');
    renderNavAuth();
    const redirect = sessionStorage.getItem('bz_redirect');
    if (redirect) { sessionStorage.removeItem('bz_redirect'); setTimeout(() => location.href = redirect, 500); }
    else setTimeout(() => location.reload(), 500);
  } catch (e) { toast(e.message || 'Ошибка входа', 'err'); }
}

async function doRegister() {
  const fio      = document.getElementById('regFio')?.value;
  const email    = document.getElementById('regEmail')?.value;
  const phone    = document.getElementById('regPhone')?.value;
  const password = document.getElementById('regPassword')?.value;
  if (!fio || !email || !password) { toast('Заполните все обязательные поля', 'err'); return; }
  try {
    const data = await api('/api/auth/register', 'POST', { fio_client: fio, email_client: email, password, tel_client: phone });
    saveAuth(data.token, data.user);
    toast('Аккаунт создан! 🌸', 'ok');
    closeModal('registerModal');
    renderNavAuth();
    setTimeout(() => location.reload(), 500);
  } catch (e) { toast(e.message || 'Ошибка регистрации', 'err'); }
}

/* ── Shared Login/Register HTML (inject into any page) ── */
function injectAuthModals() {
  const html = `
  <!-- Login -->
  <div class="overlay" id="loginModal">
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">Вход</h3>
        <button class="modal-x" onclick="closeModal('loginModal')">✕</button>
      </div>
      <div class="form-group"><label>Email</label><input type="email" id="loginEmail" placeholder="email@mail.ru"></div>
      <div class="form-group"><label>Пароль</label><input type="password" id="loginPassword" placeholder="••••••"></div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="closeModal('loginModal');openModal('registerModal')">Регистрация</button>
        <button class="btn btn-primary" onclick="doLogin()">Войти</button>
      </div>
    </div>
  </div>
  <!-- Register -->
  <div class="overlay" id="registerModal">
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">Регистрация</h3>
        <button class="modal-x" onclick="closeModal('registerModal')">✕</button>
      </div>
      <div class="form-group"><label>ФИО *</label><input type="text" id="regFio" placeholder="Иванова Мария Сергеевна"></div>
      <div class="form-row">
        <div class="form-group"><label>Email *</label><input type="email" id="regEmail"></div>
        <div class="form-group"><label>Телефон</label><input type="tel" id="regPhone" placeholder="+7 900 000-00-00"></div>
      </div>
      <div class="form-group"><label>Пароль *</label><input type="password" id="regPassword" placeholder="Минимум 6 символов"></div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="closeModal('registerModal');openModal('loginModal')">Войти</button>
        <button class="btn btn-primary" onclick="doRegister()">Создать аккаунт</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  closeOnBackdrop('loginModal');
  closeOnBackdrop('registerModal');
}

/* ── Shared Nav HTML ── */
function injectNav() {
  const html = `
  <nav id="nav">
    <a class="nav-logo" href="index.html">Bel<span>leza</span></a>
    <div class="nav-links">
      <a href="index.html"    data-page="index.html">Главная</a>
      <a href="services.html" data-page="services.html">Услуги</a>
      <a href="masters.html"  data-page="masters.html">Мастера</a>
      <a href="booking.html"  data-page="booking.html">Запись</a>
    </div>
    <div class="nav-right" id="nav-auth"></div>
  </nav>`;
  document.body.insertAdjacentHTML('afterbegin', html);
}

/* ── Shared Footer HTML ── */
function injectFooter() {
  const html = `
  <footer id="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">Bel<span>leza</span></div>
          <p class="footer-desc">Профессиональный салон красоты. Доверьте свой образ нашим мастерам.</p>
        </div>
        <div>
          <div class="footer-h">Навигация</div>
          <ul class="footer-links">
            <li><a href="index.html">Главная</a></li>
            <li><a href="services.html">Услуги</a></li>
            <li><a href="masters.html">Мастера</a></li>
            <li><a href="booking.html">Онлайн-запись</a></li>
          </ul>
        </div>
        <div>
          <div class="footer-h">Контакты</div>
          <ul class="footer-links">
            <li>ул. Примерная, 1</li>
            <li><a href="tel:+79001234567">+7 (900) 123-45-67</a></li>
            <li><a href="mailto:info@belleza.ru">info@belleza.ru</a></li>
            <li>Пн–Вс: 9:00 – 21:00</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="footer-copy">© 2025 Belleza · Дипломный проект</span>
      </div>
    </div>
  </footer>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

document.addEventListener('DOMContentLoaded', () => {
  injectNav();
  injectFooter();
  injectAuthModals();
  initNav();
});
