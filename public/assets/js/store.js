import { db, ref, get, child, set, push, showToast, toggleSkeleton, auth, onAuthStateChanged } from './firebase.js';
import { updateGlobalBadges } from './app.js';

const CART = 'albuqami_cart';
const WISH = 'albuqami_wishlist';
let products = [];
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function showView(view) {
  ['store', 'wishlist', 'cart'].forEach(name => { const el = document.getElementById(`view-${name}`); if (el) el.style.display = name === view ? 'block' : 'none'; });
  if (view === 'wishlist') renderWishlist();
  if (view === 'cart') renderCart();
}
function addToCart(product) {
  const cart = read(CART, []); const found = cart.find(item => item.id === product.id);
  if (found) found.quantity = (Number(found.quantity) || 1) + 1;
  else cart.push({ id: product.id, name: product.name || 'منتج', price: money(product.price), image: product.image || product.img || product.imageUrl || '', quantity: 1 });
  save(CART, cart); updateGlobalBadges(); showToast('تمت إضافة المنتج إلى السلة');
}
function renderProducts(list) {
  const grid = document.getElementById('products-grid'); if (!grid) return;
  grid.innerHTML = list.length ? list.map(p => `<article class="product-card"><img src="${esc(p.image || p.img || p.imageUrl || 'assets/logo1.png')}" alt="${esc(p.name)}"><div class="product-card-body"><h3>${esc(p.name || 'منتج')}</h3><p>${esc(p.description || '')}</p><strong>${money(p.price).toFixed(2)} ر.س</strong><div class="product-actions"><a class="btn-outline" href="product.html?id=${encodeURIComponent(p.id)}">التفاصيل</a><button class="btn-gold add-cart" data-id="${esc(p.id)}">أضف للسلة</button></div></div></article>`).join('') : '<p style="grid-column:1/-1;text-align:center">لا توجد منتجات متاحة حالياً.</p>';
  grid.querySelectorAll('.add-cart').forEach(button => button.addEventListener('click', () => addToCart(products.find(p => p.id === button.dataset.id))));
}
function renderWishlist() {
  const grid = document.getElementById('wishlist-grid'); if (!grid) return;
  const ids = read(WISH, []); renderProducts(products.filter(p => ids.includes(p.id)).map(p => ({ ...p, id: p.id })));
  grid.innerHTML = ids.map(id => products.find(p => p.id === id)).filter(Boolean).map(p => `<article class="product-card"><img src="${esc(p.image || p.imageUrl || 'assets/logo1.png')}" alt="${esc(p.name)}"><div class="product-card-body"><h3>${esc(p.name)}</h3><strong>${money(p.price).toFixed(2)} ر.س</strong><button class="btn-gold add-wish-cart" data-id="${esc(p.id)}">أضف للسلة</button></div></article>`).join('') || '<p>قائمة المفضلة فارغة.</p>';
  grid.querySelectorAll('.add-wish-cart').forEach(b => b.addEventListener('click', () => addToCart(products.find(p => p.id === b.dataset.id))));
}
function renderCart() {
  const list = document.getElementById('cart-items-list'); if (!list) return;
  const cart = read(CART, []); const wrapper = document.getElementById('cart-content-wrapper'); const empty = document.getElementById('cart-empty-message');
  if (wrapper) wrapper.style.display = cart.length ? 'grid' : 'none'; if (empty) empty.style.display = cart.length ? 'none' : 'block';
  let total = 0; list.innerHTML = cart.map((item, index) => { const qty = Math.max(1, Number(item.quantity) || 1); const line = money(item.price) * qty; total += line; return `<div class="cart-item-card"><div class="cart-item-info"><img src="${esc(item.image || 'assets/logo1.png')}" alt="${esc(item.name)}"><div><h4>${esc(item.name)}</h4><p>${money(item.price).toFixed(2)} ر.س</p></div></div><div class="quantity-controls"><button class="quantity-btn" data-index="${index}" data-change="-1">−</button><b>${qty}</b><button class="quantity-btn" data-index="${index}" data-change="1">+</button><button class="quantity-btn remove-cart" data-index="${index}">×</button></div></div>`; }).join('');
  const subtotal = document.getElementById('cart-subtotal'); const grand = document.getElementById('cart-total'); if (subtotal) subtotal.textContent = `${total.toFixed(2)} ر.س`; if (grand) grand.textContent = `${total.toFixed(2)} ر.س`;
  list.querySelectorAll('[data-change]').forEach(b => b.addEventListener('click', () => changeQty(Number(b.dataset.index), Number(b.dataset.change))));
  list.querySelectorAll('.remove-cart').forEach(b => b.addEventListener('click', () => changeQty(Number(b.dataset.index), -999)));
}
function changeQty(index, delta) { const cart = read(CART, []); if (!cart[index]) return; cart[index].quantity = (Number(cart[index].quantity) || 1) + delta; if (cart[index].quantity < 1) cart.splice(index, 1); save(CART, cart); updateGlobalBadges(); renderCart(); }
async function loadProducts() { const snapshot = await get(child(ref(db), 'products')); products = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...(value || {}) })) : []; renderProducts(products); }
async function setupCheckout() { const form = document.getElementById('checkout-form'); if (!form) return; form.addEventListener('submit', async event => { event.preventDefault(); const cart = read(CART, []); if (!cart.length) return showToast('السلة فارغة', 'error'); const user = auth.currentUser; if (!user) { location.href = 'login.html?return=products.html'; return; } try { const order = { orderId: `ORD-${Date.now()}`, userId: user.uid, customerName: document.getElementById('cust-name')?.value.trim(), customerPhone: document.getElementById('cust-phone')?.value.trim(), customerEmail: document.getElementById('cust-email')?.value.trim(), city: document.getElementById('cust-city')?.value.trim(), address: document.getElementById('cust-address')?.value.trim(), products: cart, status: 'بانتظار الدفع', date: new Date().toISOString() }; await set(push(ref(db, 'orders')), order); save(CART, []); updateGlobalBadges(); renderCart(); form.reset(); showToast('تم إرسال طلبك بنجاح'); } catch { showToast('تعذر إرسال الطلب، تحقق من الاتصال والصلاحيات', 'error'); } }); }

document.addEventListener('DOMContentLoaded', async () => { updateGlobalBadges(); document.getElementById('btn-cart')?.addEventListener('click', () => showView('cart')); document.getElementById('btn-wishlist')?.addEventListener('click', () => showView('wishlist')); document.getElementById('back-to-store-1')?.addEventListener('click', () => showView('store')); document.getElementById('back-to-store-2')?.addEventListener('click', () => showView('store')); document.getElementById('store-search')?.addEventListener('input', e => renderProducts(products.filter(p => `${p.name} ${p.description}`.toLowerCase().includes(e.target.value.toLowerCase())))); document.getElementById('filter-category')?.addEventListener('change', e => renderProducts(products.filter(p => e.target.value === 'all' || p.category === e.target.value))); try { toggleSkeleton('products-grid', 6, true); await loadProducts(); } catch { const grid = document.getElementById('products-grid'); if (grid) grid.innerHTML = '<p>تعذر تحميل المنتجات حالياً. حاول تحديث الصفحة.</p>'; } finally { toggleSkeleton('products-grid', 0, false); } setupCheckout(); });
export { addToCart, renderCart };