import { db, ref, get, child, set, showToast, toggleSkeleton } from './firebase.js';
import { updateGlobalBadges } from './app.js';

let productsList = [];
const STORAGE_CART = 'albuqami_cart';
const STORAGE_WISH = 'albuqami_wishlist';
const FALLBACK_IMAGE = 'https://via.placeholder.com/600x400/151515/d4af37?text=Al-Buqami';

const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const productImage = p => p?.image || p?.img || p?.imageUrl || FALLBACK_IMAGE;
const price = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function setupRoutingEvents() {
  const bind = (id, view) => document.getElementById(id)?.addEventListener('click', () => switchView(view));
  bind('btn-wishlist', 'wishlist'); bind('btn-cart', 'cart'); bind('back-to-store-1', 'store'); bind('back-to-store-2', 'store');
  const view = new URLSearchParams(location.search).get('view');
  if (view === 'cart' || view === 'wishlist') switchView(view);
  document.getElementById('store-search')?.addEventListener('input', filterProducts);
  document.getElementById('filter-category')?.addEventListener('change', filterProducts);
  document.getElementById('sort-products')?.addEventListener('change', filterProducts);
}
function switchView(view) {
  ['store', 'wishlist', 'cart'].forEach(name => { const el = document.getElementById(`view-${name}`); if (el) el.style.display = name === view ? 'block' : 'none'; });
  if (view === 'wishlist') renderWishlistView();
  if (view === 'cart') renderCartView();
}
async function loadStoreProducts() {
  const grid = document.getElementById('products-grid'); if (!grid) return;
  toggleSkeleton('products-grid', 6, true);
  try {
    const snapshot = await get(child(ref(db), 'products'));
    productsList = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, product]) => ({ id, ...(product || {}) })) : [];
    toggleSkeleton('products-grid', 0, false); renderProducts(productsList);
  } catch { toggleSkeleton('products-grid', 0, false); grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444">تعذر تحميل المنتجات حالياً.</p>'; }
}
function renderProducts(list) {
  const grid = document.getElementById('products-grid'); if (!grid) return;
  grid.innerHTML = list.length ? '' : '<p style="grid-column:1/-1;text-align:center">لا توجد أجهزة متوفرة في المتجر حالياً.</p>';
  list.forEach(p => {
    const card = document.createElement('article'); card.className = 'glass-panel'; card.style.cssText = 'padding:20px;display:flex;flex-direction:column;gap:12px';
    const image = document.createElement('img'); image.src = productImage(p); image.alt = p.name || 'منتج'; image.loading = 'lazy'; image.onerror = () => { image.src = FALLBACK_IMAGE; }; image.style.cssText = 'width:100%;height:220px;object-fit:cover;border-radius:12px';
    const title = document.createElement('h3'); title.textContent = p.name || 'منتج تقني';
    const desc = document.createElement('p'); desc.textContent = p.description || ''; desc.style.cssText = 'color:var(--text-muted);min-height:45px';
    const meta = document.createElement('div'); meta.style.cssText = 'display:flex;justify-content:space-between;align-items:center'; meta.innerHTML = `<strong style="color:var(--gold);font-size:1.2rem">${price(p.price).toFixed(2)} ر.س</strong><span style="color:#2ecc71;font-size:.8rem">الضمان: ${p.warranty || 'سنتين'}</span>`;
    const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:10px';
    const details = document.createElement('a'); details.href = `product.html?id=${encodeURIComponent(p.id)}`; details.className = 'btn-outline'; details.textContent = 'تفاصيل المنتج'; details.style.cssText = 'flex:1;text-align:center;text-decoration:none;padding:10px';
    const add = document.createElement('button'); add.className = 'btn-gold'; add.innerHTML = '<i class="fa-solid fa-cart-plus"></i>'; add.title = 'إضافة للسلة'; add.addEventListener('click', () => addToCart(p));
    actions.append(details, add); card.append(image, title, desc, meta, actions); grid.appendChild(card);
  });
}
function filterProducts() {
  const text = (document.getElementById('store-search')?.value || '').toLowerCase();
  const cat = document.getElementById('filter-category')?.value || 'all'; const sort = document.getElementById('sort-products')?.value;
  const list = productsList.filter(p => `${p.name || ''} ${p.description || ''}`.toLowerCase().includes(text) && (cat === 'all' || p.category === cat));
  if (sort === 'price-low') list.sort((a,b) => price(a.price) - price(b.price)); if (sort === 'price-high') list.sort((a,b) => price(b.price) - price(a.price));
  renderProducts(list);
}
function addToCart(product) {
  if (!product?.id) return; const cart = readJson(STORAGE_CART, []); const found = cart.find(item => item.id === product.id);
  if (found) found.quantity = Math.max(1, Number(found.quantity) || 1) + 1; else cart.push({ id: product.id, name: product.name || 'منتج', price: price(product.price), image: productImage(product), quantity: 1 });
  saveJson(STORAGE_CART, cart); updateGlobalBadges(); showToast('تم إضافة الجهاز للسلة بنجاح!', 'success');
}
function renderWishlistView() {
  const grid = document.getElementById('wishlist-grid'); if (!grid) return; const ids = readJson(STORAGE_WISH, []); const list = productsList.filter(p => ids.includes(p.id));
  grid.innerHTML = list.length ? '' : '<p style="grid-column:1/-1;text-align:center">لا توجد أجهزة في قائمتك المفضلة حالياً.</p>';
  list.forEach(p => { const card = document.createElement('div'); card.className = 'glass-panel'; card.style.padding = '20px'; card.innerHTML = `<img src="${productImage(p)}" style="width:100%;height:180px;object-fit:cover;border-radius:12px"><h3 style="margin:15px 0">${p.name || ''}</h3><strong style="color:var(--gold)">${price(p.price).toFixed(2)} ر.س</strong>`; const remove = document.createElement('button'); remove.className = 'btn-outline'; remove.textContent = 'إزالة'; remove.style.cssText = 'margin-top:15px;color:#ef4444;border-color:#ef4444'; remove.onclick = () => { saveJson(STORAGE_WISH, ids.filter(id => id !== p.id)); updateGlobalBadges(); renderWishlistView(); }; card.appendChild(remove); grid.appendChild(card); });
}
function renderCartView() {
  const list = document.getElementById('cart-items-list'), wrapper = document.getElementById('cart-content-wrapper'), empty = document.getElementById('cart-empty-message'); if (!list) return;
  const cart = readJson(STORAGE_CART, []); if (!cart.length) { if (wrapper) wrapper.style.display = 'none'; if (empty) empty.style.display = 'block'; return; }
  if (wrapper) wrapper.style.display = 'grid'; if (empty) empty.style.display = 'none'; list.innerHTML = ''; let total = 0;
  cart.forEach((item, index) => { const qty = Math.max(1, Number(item.quantity) || 1), itemTotal = price(item.price) * qty; total += itemTotal; const row = document.createElement('div'); row.className = 'cart-item-card'; row.innerHTML = `<div class="cart-item-info"><img src="${item.image || FALLBACK_IMAGE}" alt="${item.name || ''}"><div><h4>${item.name || ''}</h4><span style="color:var(--gold)">${price(item.price).toFixed(2)} ر.س</span></div></div><div class="quantity-controls"><button class="quantity-btn">−</button><b>${qty}</b><button class="quantity-btn">+</button><strong>${itemTotal.toFixed(2)} ر.س</strong><button class="btn-delete-item" style="color:#ef4444;background:none;border:0">حذف</button></div>`; const buttons = row.querySelectorAll('.quantity-btn'); buttons[0].onclick = () => changeQty(index, -1); buttons[1].onclick = () => changeQty(index, 1); row.querySelector('.btn-delete-item').onclick = () => removeCartItem(index); list.appendChild(row); });
  document.getElementById('cart-subtotal').textContent = `${total.toFixed(2)} ر.س`; document.getElementById('cart-total').textContent = `${total.toFixed(2)} ر.س`;
}
function changeQty(index, delta) { const cart = readJson(STORAGE_CART, []); if (!cart[index]) return; cart[index].quantity = (Number(cart[index].quantity) || 1) + delta; if (cart[index].quantity < 1) cart.splice(index, 1); saveJson(STORAGE_CART, cart); updateGlobalBadges(); renderCartView(); }
function removeCartItem(index) { const cart = readJson(STORAGE_CART, []); cart.splice(index, 1); saveJson(STORAGE_CART, cart); updateGlobalBadges(); renderCartView(); }
async function setupCheckout() {
  const form = document.getElementById('checkout-form'); if (!form) return;
  form.addEventListener('submit', async event => { event.preventDefault(); const cart = readJson(STORAGE_CART, []); if (!cart.length) return showToast('سلتك فارغة!', 'error');
    const orderId = `BQ-${Date.now().toString().slice(-8)}`, data = { orderId, customerName: document.getElementById('cust-name').value.trim(), customerPhone: document.getElementById('cust-phone').value.trim(), customerEmail: document.getElementById('cust-email').value.trim(), city: document.getElementById('cust-city').value.trim(), address: document.getElementById('cust-address').value.trim(), products: cart, total: cart.reduce((sum, i) => sum + price(i.price) * Math.max(1, Number(i.quantity) || 1), 0), date: new Date().toISOString(), status: 'جديد' };
    try { await set(ref(db, `orders/${orderId}`), data); await set(ref(db, `invoices/${orderId}`), { invoiceId: `INV-${Date.now().toString().slice(-8)}`, ...data, status: 'بانتظار الدفع' }); saveJson(STORAGE_CART, []); updateGlobalBadges(); showToast(`تم إرسال الطلب بنجاح برقم: ${orderId}`, 'success'); setTimeout(() => location.href = `invoice.html?orderId=${encodeURIComponent(orderId)}`, 800); } catch { showToast('فشل إرسال الطلب، الرجاء المحاولة مجدداً.', 'error'); }
  });
}
document.addEventListener('DOMContentLoaded', () => { loadStoreProducts(); setupRoutingEvents(); setupCheckout(); });
