import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, set, get, update, remove, child, onValue, push } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC9cmh_bzA4ZeV8bYlbqaGrmIri2PUGx2A',
  authDomain: 'voip17.firebaseapp.com',
  databaseURL: 'https://voip17-default-rtdb.firebaseio.com',
  projectId: 'voip17',
  storageBucket: 'voip17.firebasestorage.app',
  messagingSenderId: '608379006778',
  appId: '1:608379006778:web:51fe8032d09fbd5b556a03',
  measurementId: 'G-GZNJZLM701'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function showToast(message, type = 'success') {
  let box = document.getElementById('toast-container');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-container';
    box.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:99999;display:grid;gap:10px;max-width:min(360px,90vw)';
    document.body.appendChild(box);
  }
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `background:#171717;color:#fff;border-right:4px solid ${type === 'success' ? '#d4af37' : '#ef4444'};padding:12px 18px;border-radius:6px;box-shadow:0 5px 20px #0008`;
  box.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function toggleSkeleton(id, count = 3, show = true) {
  const element = document.getElementById(id);
  if (!element) return;
  element.querySelectorAll('.skeleton-loader-item').forEach(item => item.remove());
  if (!show) return;
  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');
    item.className = 'skeleton-loader-item';
    item.style.cssText = 'height:180px;background:#ffffff10;border-radius:12px';
    element.appendChild(item);
  }
}

export { auth, db, showToast, toggleSkeleton, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, ref, set, get, update, remove, child, onValue, push };