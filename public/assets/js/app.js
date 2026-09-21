document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) setTimeout(() => { loader.style.opacity = '0'; loader.style.visibility = 'hidden'; }, 500);
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('mobile-open'));
  updateGlobalBadges();
});

export function updateGlobalBadges() {
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const cart = read('albuqami_cart', []), wishlist = read('albuqami_wishlist', []);
  const cartBadge = document.getElementById('cart-badge'), wishBadge = document.getElementById('wishlist-badge');
  if (cartBadge) cartBadge.textContent = cart.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  if (wishBadge) wishBadge.textContent = wishlist.length;
}
