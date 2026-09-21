import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, set, get, update, remove, child, onValue, push } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBgRkceRq7FRbhCevLlYNy-A5Tl_cr0w',
  authDomain: 'sr-test-c9e06.firebaseapp.com', databaseURL: 'https://sr-test-c9e06-default-rtdb.firebaseio.com',
  projectId: 'sr-test-c9e06', storageBucket: 'sr-test-c9e06.firebasestorage.app', messagingSenderId: '658396508062', appId: '1:658396508062:web:ca94047d35122e2876308f'
};
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getDatabase(app);
function showToast(message, type = 'success') {
  let box = document.getElementById('toast-container');
  if (!box) { box = document.createElement('div'); box.id = 'toast-container'; box.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:99999;display:grid;gap:10px'; document.body.appendChild(box); }
  const toast = document.createElement('div'); toast.textContent = message; toast.style.cssText = `background:#171717;color:#fff;border-right:4px solid ${type === 'success' ? '#d4af37' : '#ef4444'};padding:14px 20px;border-radius:8px;direction:rtl;min-width:240px;box-shadow:0 5px 20px #0008`;
  box.appendChild(toast); setTimeout(() => toast.remove(), 4000);
}
function toggleSkeleton(id, count = 3, show = true) { const el = document.getElementById(id); if (!el) return; if (!show) { el.querySelectorAll('.skeleton-loader-item').forEach(x => x.remove()); return; } el.innerHTML = Array.from({ length: count }, () => '<div class="skeleton-loader-item"></div>').join(''); }
export { auth, db, showToast, toggleSkeleton, onAuthStateChanged, signInWithEmailAndPassword, signOut, ref, set, get, update, remove, child, onValue, push };
