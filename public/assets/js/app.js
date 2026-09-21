import { auth, onAuthStateChanged, signOut } from './firebase.js';

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export function updateGlobalBadges() {
  const cart = read('albuqami_cart', []);
  const wishlist = read('albuqami_wishlist', []);
  const cartBadge = document.getElementById('cart-badge');
  const wishBadge = document.getElementById('wishlist-badge');
  if (cartBadge) cartBadge.textContent = String(cart.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0));
  if (wishBadge) wishBadge.textContent = String(wishlist.length);
}

function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  toggle?.addEventListener('click', () => links?.classList.toggle('mobile-open'));
  links?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => links.classList.remove('mobile-open')));

  const button = document.getElementById('auth-nav-btn');
  if (button) onAuthStateChanged(auth, user => {
    button.href = user ? 'account.html' : 'login.html';
    button.title = user ? 'حسابي' : 'تسجيل الدخول';
    button.innerHTML = user ? '<i class="fa-solid fa-user-check"></i>' : '<i class="fa-regular fa-user"></i>';
  });
}

export function addLogoutHandler(buttonId = 'logout-btn') {
  document.getElementById(buttonId)?.addEventListener('click', async () => {
    await signOut(auth);
    location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) setTimeout(() => { loader.style.opacity = '0'; loader.style.visibility = 'hidden'; }, 500);
  setupNavigation();
  updateGlobalBadges();
  window.addEventListener('storage', updateGlobalBadges);
});