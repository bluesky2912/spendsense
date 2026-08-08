/* ============================================================
   auth.js — SpendSense Premium AI
   Login / Signup / Logout, and a lightweight sync layer that
   mirrors localStorage to Firestore so the same account shows
   the same data across devices. The rest of the app is untouched
   — it still reads/writes localStorage exactly as before; this
   file just keeps the cloud copy in step with it.
   ============================================================ */

let firebaseApp   = null;
let auth          = null;
let db            = null;
let currentUser   = null;
let appBooted     = false;
let syncTimer     = null;
let authMode      = 'login'; // 'login' | 'signup'

/* Every key SpendSense stores locally. Kept in one place so the
   sync layer and any future new features can't drift out of sync
   with what actually needs to travel to the cloud. */
const SS_KEYS = [
  'ss_expenses', 'ss_budget', 'ss_savage', 'ss_unlocked', 'ss_goals',
  'ss_catbudgets', 'ss_recurring', 'ss_theme', 'ss_xp', 'ss_nudge_dismissed',
  'ss_incomes', 'ss_settlements', 'ss_quest_claims', 'ss_chat_history',
  'ss_dismissed_recurring', 'ss_notes', 'ss_notes_meta',
];

/* ── Firebase init (safe no-op if config was never filled in) ── */
function initFirebase() {
  if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.warn('SpendSense: firebase-config.js is still using placeholder values — cloud sync disabled, running local-only.');
    bootApp();
    return;
  }
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db   = firebase.firestore();
    auth.onAuthStateChanged(handleAuthStateChanged);
  } catch (err) {
    console.warn('SpendSense: Firebase failed to initialize, running local-only.', err);
    bootApp();
  }
}

/* ── Auth state changes (login, logout, or page load with a session) ── */
async function handleAuthStateChanged(user) {
  if (user) {
    currentUser = user;
    updateAccountUI();
    await syncOnLogin();
    hideAuthOverlay();
    if (typeof dismissIntro === 'function') dismissIntro();
    if (!appBooted) bootApp();
  } else {
    currentUser = null;
    updateAccountUI();
    if (typeof dismissIntro === 'function') dismissIntro();
    if (!appBooted) showAuthOverlay();
  }
}

/* ── Pull-or-push resolution when a session is confirmed ── */
async function syncOnLogin() {
  const statusEl = document.getElementById('authStatus');
  if (statusEl) statusEl.textContent = 'Syncing your data…';

  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const hasLocalData = SS_KEYS.some(k => localStorage.getItem(k) !== null);

    if (doc.exists && doc.data().data) {
      applySnapshotToLocal(doc.data().data);
      showToastSafe('☁️ Synced — your data is up to date on this device');
    } else if (hasLocalData) {
      await pushToCloud();
      showToastSafe('☁️ This device\'s data has been backed up to your account');
    }
    setLastSynced();
  } catch (err) {
    console.warn('SpendSense sync error:', err);
    showToastSafe('⚠️ Could not sync right now — working from local data', 'error');
  }
}

function snapshotLocalData() {
  const snap = {};
  SS_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) snap[k] = v;
  });
  return snap;
}

function applySnapshotToLocal(snap) {
  SS_KEYS.forEach(k => {
    if (snap[k] !== undefined) localStorage.setItem(k, snap[k]);
    else localStorage.removeItem(k);
  });
}

async function pushToCloud() {
  if (!currentUser || !db) return;
  try {
    await db.collection('users').doc(currentUser.uid).set({
      data: snapshotLocalData(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    setLastSynced();
  } catch (err) {
    console.warn('SpendSense push error:', err);
  }
}

/* Called by storage.js on every local write — debounced so rapid
   changes (typing, quick taps) collapse into one network call. */
function scheduleCloudSync() {
  if (!currentUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushToCloud, 2000);
}

window.addEventListener('visibilitychange', () => {
  if (document.hidden && currentUser) pushToCloud();
});

function setLastSynced() {
  localStorage.setItem('ss_last_synced', new Date().toISOString());
  updateAccountUI();
}

/* ── Auth screen actions ── */
function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById('authTabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('authTabSignup').classList.toggle('active', mode === 'signup');
  document.getElementById('authSubmitBtn').querySelector('span').textContent = mode === 'login' ? 'Log In' : 'Create Account';
  document.getElementById('authError').style.display = 'none';
}

function authErrorMessage(err) {
  const map = {
    'auth/invalid-email':        'That email address looks invalid.',
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/email-already-in-use': 'An account already exists with that email — try logging in instead.',
    'auth/weak-password':        'Password should be at least 6 characters.',
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/too-many-requests':    'Too many attempts — try again in a bit.',
  };
  return map[err.code] || err.message || 'Something went wrong. Please try again.';
}

async function submitAuthForm() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl    = document.getElementById('authError');
  const btn      = document.getElementById('authSubmitBtn');

  errEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent = 'Enter both an email and password.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  try {
    if (authMode === 'login') {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
    }
    /* handleAuthStateChanged takes it from here */
  } catch (err) {
    errEl.textContent = authErrorMessage(err);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}

async function sendPasswordReset() {
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  if (!email) {
    errEl.textContent = 'Enter your email above first, then tap "Forgot password".';
    errEl.style.display = 'block';
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    errEl.style.display = 'none';
    showToastSafe('📧 Password reset email sent — check your inbox');
  } catch (err) {
    errEl.textContent = authErrorMessage(err);
    errEl.style.display = 'block';
  }
}

function skipAuth() {
  hideAuthOverlay();
  if (!appBooted) bootApp();
}

function showAuthOverlay() {
  const el = document.getElementById('authOverlay');
  if (el) el.classList.add('show');
}
function hideAuthOverlay() {
  const el = document.getElementById('authOverlay');
  if (el) el.classList.remove('show');
}

/* ── Account modal ── */
function showAccountModal() { document.getElementById('accountModal')?.classList.add('show'); }
function hideAccountModal() { document.getElementById('accountModal')?.classList.remove('show'); }

function updateAccountUI() {
  const body = document.getElementById('accountModalBody');
  if (!body) return;

  if (currentUser) {
    const last = localStorage.getItem('ss_last_synced');
    const lastStr = last ? new Date(last).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never yet';
    body.innerHTML = `
      <div style="text-align:center; padding:6px 0 16px">
        <div style="font-size:32px; margin-bottom:8px">☁️</div>
        <div style="font-weight:700; font-size:14px">${escapeHtml(currentUser.email)}</div>
        <div style="font-size:11px; color:var(--text2); margin-top:4px">Last synced: ${lastStr}</div>
      </div>
      <button class="save-budget-btn" onclick="pushToCloud().then(() => showToastSafe('☁️ Synced!'))">🔄 Sync Now</button>
      <button class="danger-btn danger-red" style="width:100%; margin-top:8px" onclick="logOut()">Log Out</button>`;
  } else {
    body.innerHTML = `
      <div style="text-align:center; padding:6px 0 16px">
        <div style="font-size:32px; margin-bottom:8px">📴</div>
        <div style="font-weight:700; font-size:14px">Not signed in</div>
        <div style="font-size:11px; color:var(--text2); margin-top:4px">Your data is local to this device only</div>
      </div>
      <button class="add-btn" onclick="hideAccountModal(); showAuthOverlay();"><span>Sign In / Create Account</span><span>→</span></button>`;
  }
}

async function logOut() {
  if (currentUser) await pushToCloud(); // last-chance sync before leaving
  await auth.signOut();
  hideAccountModal();
  showToastSafe('👋 Logged out — this device now stays local-only');
}

/* Small helper: showToast only exists once app.js has loaded.
   Falls back to console during the brief pre-boot window. */
function showToastSafe(msg, type) {
  if (typeof showToast === 'function') showToast(msg, type || 'default');
  else console.log(msg);
}

/* ── Kick things off ── */
document.addEventListener('DOMContentLoaded', initFirebase);