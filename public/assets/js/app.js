import { auth, onAuthStateChanged, signOut } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) setTimeout(() => { loader.style.opacity = '0'; loader.style.visibility = 'hidden'; }, 500);
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('mobile-open'));
  updateGlobalBadges();
  setupAccountNavigation();
});

export function updateGlobalBadges() {
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const cart = read('albuqami_cart', []), wishlist = read('albuqami_wishlist', []);
  const cartBadge = document.getElementById('cart-badge'), wishBadge = document.getElementById('wishlist-badge');
  if (cartBadge) cartBadge.textContent = cart.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  if (wishBadge) wishBadge.textContent = wishlist.length;
}

function setupAccountNavigation() {
  const button = document.getElementById('auth-nav-btn');
  if (!button) return;
  onAuthStateChanged(auth, user => {
    if (!user) {
      button.href = 'login.html';
      button.title = 'تسجيل الدخول';
      button.innerHTML = '<i class="fa-regular fa-user"></i>';
      return;
    }
    button.href = 'account.html';
    button.title = 'حسابي';
    button.innerHTML = '<i class="fa-solid fa-user-check"></i>';
  });
}

export function addLogoutHandler(buttonId = 'logout-btn') {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}
