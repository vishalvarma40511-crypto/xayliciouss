'use strict';

const AUTH_USERS_KEY = 'xaylicioussUsers';
const AUTH_SESSION_KEY = 'xaylicioussSignedInUser';
const authElements = {};

function normalizeContact(contact) {
  return String(contact || '').trim().toLowerCase();
}

function getApiBaseUrl() {
  const currentPort = window.location.port;
  const currentHostname = window.location.hostname || 'localhost';
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(currentHostname);

  // Production/Render deployment: frontend and backend run on the same domain.
  if (!isLocalHost) return '';

  // Local Node server: frontend and backend both run on port 3000.
  if (currentPort === '3000') return '';

  // VS Code Live Server/local preview: connect to the local Node backend.
  return `http://${currentHostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3000`;
}

function buildApiUrl(endpoint) {
  return `${getApiBaseUrl()}${endpoint}`;
}

async function postAuthToDatabase(endpoint, payload) {
  const response = await fetch(buildApiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.success !== false, data };
}

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
  } catch (error) {
    localStorage.removeItem(AUTH_USERS_KEY);
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function upsertStoredUser(user, password = '') {
  if (!user || !user.contact) return;
  const contact = normalizeContact(user.contact);
  const users = getStoredUsers();
  const existingIndex = users.findIndex((item) => normalizeContact(item.contact) === contact);
  const existingUser = existingIndex >= 0 ? users[existingIndex] : {};
  const savedUser = {
    ...existingUser,
    id: user.id || existingUser.id || `LOCAL-${Date.now()}`,
    name: user.name || existingUser.name || 'Xayliciouss Customer',
    contact,
    password: password || existingUser.password || '',
    provider: user.provider || existingUser.provider || 'Email/Phone',
    createdAt: user.createdAt || existingUser.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  if (existingIndex >= 0) users[existingIndex] = savedUser;
  else users.push(savedUser);
  saveStoredUsers(users);
}

function setSignedInUser(user) {
  const safeUser = {
    id: user.id || `LOCAL-${Date.now()}`,
    name: user.name,
    contact: user.contact,
    provider: user.provider || 'Email/Phone',
    createdAt: user.createdAt || new Date().toISOString()
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeUser));
}

function getSignedInUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)) || null;
  } catch (error) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function showAuthError(inputElement, errorElement, message) {
  const group = inputElement && inputElement.closest('.form-group');
  if (group) group.classList.add('invalid');
  if (errorElement) errorElement.textContent = message;
}

function clearAuthErrors(form) {
  if (!form) return;
  form.querySelectorAll('.form-group').forEach((group) => group.classList.remove('invalid'));
  form.querySelectorAll('.error-message').forEach((error) => { error.textContent = ''; });
  form.querySelectorAll('.success-message').forEach((success) => { success.textContent = ''; });
}

function showAuthTab(tabName) {
  const isLogin = tabName === 'login';
  authElements.loginTab.classList.toggle('active', isLogin);
  authElements.registerTab.classList.toggle('active', !isLogin);
  authElements.loginTab.setAttribute('aria-selected', String(isLogin));
  authElements.registerTab.setAttribute('aria-selected', String(!isLogin));
  authElements.loginForm.classList.toggle('active', isLogin);
  authElements.registerForm.classList.toggle('active', !isLogin);
  authElements.loginForm.hidden = !isLogin;
  authElements.registerForm.hidden = isLogin;
  clearAuthErrors(authElements.loginForm);
  clearAuthErrors(authElements.registerForm);
}

function redirectToDashboard(delay = 500) {
  window.setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, delay);
}

function showSignedInSuccessPopup(user, mode = 'signed in') {
  const existing = document.querySelector('.auth-success-modal');
  if (existing) existing.remove();

  const firstName = user?.name ? user.name.split(' ')[0] : 'Customer';
  const modal = document.createElement('div');
  modal.className = 'signin-order-modal auth-success-modal';
  modal.innerHTML = `
    <div class="signin-order-backdrop" data-auth-success-close></div>
    <section class="signin-order-card auth-success-card" role="dialog" aria-modal="true" aria-labelledby="authSuccessTitle">
      <div class="auth-success-check" aria-hidden="true">
        <span>✓</span>
      </div>
      <p class="auth-success-eyebrow">Welcome to Xayliciouss</p>
      <h2 id="authSuccessTitle">You have ${mode} successfully</h2>
      <p class="signin-order-text">
        Hi ${firstName}, your account is ready. You can now place orders, track your dessert history, and collect bonus points.
      </p>
      <div class="auth-success-progress" aria-hidden="true"><span></span></div>
      <div class="signin-order-actions single-action">
        <button class="btn btn-primary" type="button" data-auth-success-dashboard>Go to Dashboard</button>
      </div>
    </section>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('signin-modal-open');

  let isRedirecting = false;
  const closeAndRedirect = () => {
    if (isRedirecting) return;
    isRedirecting = true;
    modal.classList.remove('show');
    window.setTimeout(() => {
      modal.remove();
      document.body.classList.remove('signin-modal-open');
      window.location.href = 'dashboard.html';
    }, 180);
  };

  modal.querySelector('[data-auth-success-dashboard]').addEventListener('click', closeAndRedirect);
  modal.querySelector('[data-auth-success-close]').addEventListener('click', closeAndRedirect);

  requestAnimationFrame(() => modal.classList.add('show'));
  window.setTimeout(closeAndRedirect, 2200);
}

function completeAuthSuccess(user, mode) {
  updateSignedInPanel();
  showSignedInSuccessPopup(user, mode);
}

function updateSignedInPanel() {
  const user = getSignedInUser();
  const isSignedIn = Boolean(user && user.name);

  authElements.signedInPanel.hidden = !isSignedIn;
  authElements.loginForm.hidden = isSignedIn || !authElements.loginForm.classList.contains('active');
  authElements.registerForm.hidden = isSignedIn || !authElements.registerForm.classList.contains('active');

  if (authElements.loginTab && authElements.registerTab) {
    authElements.loginTab.disabled = isSignedIn;
    authElements.registerTab.disabled = isSignedIn;
  }

  if (isSignedIn) {
    authElements.signedInMessage.textContent = `Welcome ${user.name}. Your dashboard is ready with order tracking, order history, and bonus points.`;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  clearAuthErrors(authElements.registerForm);

  const name = authElements.registerName.value.trim();
  const contact = normalizeContact(authElements.registerContact.value);
  const password = authElements.registerPassword.value.trim();
  let isValid = true;

  if (!name) {
    showAuthError(authElements.registerName, authElements.registerNameError, 'Name is required.');
    isValid = false;
  }
  if (!contact) {
    showAuthError(authElements.registerContact, authElements.registerContactError, 'Email or phone is required.');
    isValid = false;
  }
  if (!password) {
    showAuthError(authElements.registerPassword, authElements.registerPasswordError, 'Password is required.');
    isValid = false;
  } else if (password.length < 6) {
    showAuthError(authElements.registerPassword, authElements.registerPasswordError, 'Password must be at least 6 characters.');
    isValid = false;
  }
  if (!isValid) return;

  try {
    const databaseResult = await postAuthToDatabase('/api/register', { name, contact, password });
    if (databaseResult.ok) {
      upsertStoredUser(databaseResult.data.user, password);
      setSignedInUser(databaseResult.data.user);
      authElements.registerSuccess.textContent = 'Account created successfully.';
      authElements.registerForm.reset();
      completeAuthSuccess(databaseResult.data.user, 'created your account');
      return;
    }
    showAuthError(authElements.registerContact, authElements.registerContactError, databaseResult.data.message || 'Unable to create account.');
    return;
  } catch (error) {
    // Live Server fallback: localStorage only.
  }

  const users = getStoredUsers();
  const userExists = users.some((user) => normalizeContact(user.contact) === contact);
  if (userExists) {
    showAuthError(authElements.registerContact, authElements.registerContactError, 'An account already exists with this contact. Please sign in.');
    return;
  }

  const newUser = { id: `LOCAL-${Date.now()}`, name, contact, password, provider: 'Local Prototype', createdAt: new Date().toISOString() };
  users.push(newUser);
  saveStoredUsers(users);
  setSignedInUser(newUser);
  authElements.registerSuccess.textContent = 'Account created successfully.';
  authElements.registerForm.reset();
  completeAuthSuccess(newUser, 'created your account');
}

async function handleLogin(event) {
  event.preventDefault();
  clearAuthErrors(authElements.loginForm);

  const contact = normalizeContact(authElements.loginContact.value);
  const password = authElements.loginPassword.value.trim();
  let isValid = true;

  if (!contact) {
    showAuthError(authElements.loginContact, authElements.loginContactError, 'Email or phone is required.');
    isValid = false;
  }
  if (!password) {
    showAuthError(authElements.loginPassword, authElements.loginPasswordError, 'Password is required.');
    isValid = false;
  }
  if (!isValid) return;

  let databaseErrorMessage = '';
  try {
    const databaseResult = await postAuthToDatabase('/api/login', { contact, password });
    if (databaseResult.ok) {
      upsertStoredUser(databaseResult.data.user, password);
      setSignedInUser(databaseResult.data.user);
      authElements.loginSuccess.textContent = 'Signed in successfully.';
      authElements.loginForm.reset();
      completeAuthSuccess(databaseResult.data.user, 'signed in');
      return;
    }
    databaseErrorMessage = databaseResult.data.message || 'Invalid contact or password.';
  } catch (error) {
    // Local fallback: use browser-saved demo accounts when backend is unavailable.
  }

  const users = getStoredUsers();
  const matchedUser = users.find((user) => normalizeContact(user.contact) === contact && user.password === password);
  if (!matchedUser) {
    showAuthError(authElements.loginPassword, authElements.loginPasswordError, databaseErrorMessage || 'Invalid contact or password. Create an account first if you are new.');
    return;
  }

  setSignedInUser(matchedUser);
  authElements.loginSuccess.textContent = 'Signed in successfully.';
  authElements.loginForm.reset();
  completeAuthSuccess(matchedUser, 'signed in');
}

async function handleGooglePrototypeSignIn() {
  const name = window.prompt('Enter the name on your Google account:');
  if (!name || !name.trim()) return;

  const contact = window.prompt('Enter your Gmail address:');
  if (!contact || !contact.trim()) return;

  const cleanName = name.trim();
  const cleanContact = normalizeContact(contact);

  if (!cleanContact.includes('@')) {
    authElements.loginSuccess.textContent = '';
    showAuthError(authElements.loginContact, authElements.loginContactError, 'Please enter a valid Google email address.');
    return;
  }

  try {
    const databaseResult = await postAuthToDatabase('/api/google-signin', { name: cleanName, contact: cleanContact });
    if (databaseResult.ok) {
      upsertStoredUser(databaseResult.data.user);
      setSignedInUser(databaseResult.data.user);
      authElements.loginSuccess.textContent = 'Google sign-in completed.';
      completeAuthSuccess(databaseResult.data.user, 'signed in with Google');
      return;
    }
  } catch (error) {
    // Live Server fallback below.
  }

  const users = getStoredUsers();
  let user = users.find((item) => normalizeContact(item.contact) === cleanContact);
  if (!user) {
    user = { id: `GOOGLE-${Date.now()}`, name: cleanName, contact: cleanContact, provider: 'Google Prototype', createdAt: new Date().toISOString() };
    users.push(user);
    saveStoredUsers(users);
  }
  setSignedInUser(user);
  authElements.loginSuccess.textContent = 'Google sign-in completed.';
  completeAuthSuccess(user, 'signed in with Google');
}

function handleLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  showAuthTab('login');
  updateSignedInPanel();
}

function cacheAuthElements() {
  authElements.loginTab = document.getElementById('loginTab');
  authElements.registerTab = document.getElementById('registerTab');
  authElements.loginForm = document.getElementById('loginForm');
  authElements.registerForm = document.getElementById('registerForm');
  authElements.loginContact = document.getElementById('loginContact');
  authElements.loginPassword = document.getElementById('loginPassword');
  authElements.registerName = document.getElementById('registerName');
  authElements.registerContact = document.getElementById('registerContact');
  authElements.registerPassword = document.getElementById('registerPassword');
  authElements.loginContactError = document.getElementById('loginContactError');
  authElements.loginPasswordError = document.getElementById('loginPasswordError');
  authElements.registerNameError = document.getElementById('registerNameError');
  authElements.registerContactError = document.getElementById('registerContactError');
  authElements.registerPasswordError = document.getElementById('registerPasswordError');
  authElements.loginSuccess = document.getElementById('loginSuccess');
  authElements.registerSuccess = document.getElementById('registerSuccess');
  authElements.signedInPanel = document.getElementById('signedInPanel');
  authElements.signedInMessage = document.getElementById('signedInMessage');
  authElements.logoutBtn = document.getElementById('logoutBtn');
  authElements.googleSignInBtn = document.getElementById('googleSignInBtn');
}

function initAuthPage() {
  cacheAuthElements();
  if (!authElements.loginForm || !authElements.registerForm) return;

  authElements.loginTab.addEventListener('click', () => showAuthTab('login'));
  authElements.registerTab.addEventListener('click', () => showAuthTab('register'));
  authElements.loginForm.addEventListener('submit', handleLogin);
  authElements.registerForm.addEventListener('submit', handleRegister);
  if (authElements.googleSignInBtn) authElements.googleSignInBtn.addEventListener('click', handleGooglePrototypeSignIn);
  if (authElements.logoutBtn) authElements.logoutBtn.addEventListener('click', handleLogout);

  updateSignedInPanel();
}

document.addEventListener('DOMContentLoaded', initAuthPage);
