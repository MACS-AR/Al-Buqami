import { db, ref, get, child, set, push, showToast, toggleSkeleton, auth, onAuthStateChanged } from './firebase.js';
import { updateGlobalBadges } from './app.js';

const CART = 'albuqami_cart';
const WISH = 'albuqami_wishlist';
let products = [];
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderProductCards(list) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center">لا توجد منتجات متاحة حالياً.</p>';
    return;
  }

  grid.innerHTML = list.map(product => {
    const image = product.image || product.img || product.imageUrl || 'assets/logo1.png';
    const price = money(product.price).toFixed(2);
    const productId = product.id || product.productId || '';
    return `
      <article class="product-card">
        <img src="${esc(image)}" alt="${esc(product.name || 'منتج')}" />
        <div class="product-card-body">
          <h3>${esc(product.name || 'منتج')}</h3>
          <p>${esc(product.description || product.specs || 'منتج ذكي عالي الجودة.')}</p>
          <strong>${price} ر.س</strong>
          <div class="product-actions">
            <a class="btn-outline" href="product.html?id=${encodeURIComponent(productId || product.name || '')}">التفاصيل</a>
            <button class="btn-gold add-cart" data-id="${esc(productId || product.name || '')}">أضف للسلة</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.add-cart').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = String(button.dataset.id || '');
      const product = products.find(item => String(item.id || item.productId || item.name) === targetId);
      if (product) addToCart(product);
    });
  });
}

function addToCart(product) {
  const cart = read(CART, []);
  const found = cart.find(item => String(item.id || item.productId || item.name) === String(product.id || product.productId || product.name));
  if (found) {
    found.quantity = (Number(found.quantity) || 1) + 1;
  } else {
    cart.push({
      id: product.id || product.productId || product.name,
      name: product.name || 'منتج',
      price: money(product.price),
      image: product.image || product.img || product.imageUrl || 'assets/logo1.png',
      quantity: 1
    });
  }

  save(CART, cart);
  updateGlobalBadges();
  showToast('تمت إضافة المنتج إلى السلة');
}

function renderWishlist() {
  const grid = document.getElementById('wishlist-grid');
  if (!grid) return;
  const ids = read(WISH, []);
  const items = products.filter(product => ids.includes(product.id || product.productId || product.name));

  if (!items.length) {
    grid.innerHTML = '<p>قائمة المفضلة فارغة.</p>';
    return;
  }

  grid.innerHTML = items.map(product => `
    <article class="product-card">
      <img src="${esc(product.image || product.img || product.imageUrl || 'assets/logo1.png')}" alt="${esc(product.name || 'منتج')}" />
      <div class="product-card-body">
        <h3>${esc(product.name || 'منتج')}</h3>
        <strong>${money(product.price).toFixed(2)} ر.س</strong>
        <button class="btn-gold add-wish-cart" data-id="${esc(product.id || product.productId || product.name || '')}">أضف للسلة</button>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.add-wish-cart').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = String(button.dataset.id || '');
      const product = products.find(item => String(item.id || item.productId || item.name) === targetId);
      if (product) addToCart(product);
    });
  });
}

function renderCart() {
  const list = document.getElementById('cart-items-list');
  if (!list) return;

  const cart = read(CART, []);
  const wrapper = document.getElementById('cart-content-wrapper');
  const empty = document.getElementById('cart-empty-message');

  if (wrapper) wrapper.style.display = cart.length ? 'grid' : 'none';
  if (empty) empty.style.display = cart.length ? 'none' : 'block';

  let total = 0;
  list.innerHTML = cart.map((item, index) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = money(item.price) * qty;
    total += lineTotal;
    return `
      <div class="cart-item-card">
        <div class="cart-item-info">
          <img src="${esc(item.image || 'assets/logo1.png')}" alt="${esc(item.name)}" />
          <div>
            <h4>${esc(item.name)}</h4>
            <p>${money(item.price).toFixed(2)} ر.س</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div class="quantity-controls">
            <button class="quantity-btn" data-index="${index}" data-change="-1">−</button>
            <span>${qty}</span>
            <button class="quantity-btn" data-index="${index}" data-change="1">+</button>
          </div>
          <button class="btn-outline remove-cart" data-index="${index}">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  const subtotal = document.getElementById('cart-subtotal');
  const grand = document.getElementById('cart-total');
  if (subtotal) subtotal.textContent = `${total.toFixed(2)} ر.س`;
  if (grand) grand.textContent = `${total.toFixed(2)} ر.س`;

  list.querySelectorAll('[data-change]').forEach(button => {
    button.addEventListener('click', () => changeQty(Number(button.dataset.index), Number(button.dataset.change)));
  });

  list.querySelectorAll('.remove-cart').forEach(button => {
    button.addEventListener('click', () => changeQty(Number(button.dataset.index), -999));
  });
}

function changeQty(index, delta) {
  const cart = read(CART, []);
  if (!cart[index]) return;
  cart[index].quantity = (Number(cart[index].quantity) || 1) + delta;
  if (cart[index].quantity < 1) cart.splice(index, 1);
  save(CART, cart);
  updateGlobalBadges();
  renderCart();
}

async function loadProducts() {
  const snapshot = await get(child(ref(db), 'products'));
  const raw = snapshot.exists() ? snapshot.val() : {};
  products = Object.entries(raw).map(([id, product]) => ({ id, ...(product || {}) }));
  renderProductCards(products);
}

function showView(view) {
  ['store', 'wishlist', 'cart'].forEach(name => {
    const el = document.getElementById(`view-${name}`);
    if (el) el.style.display = name === view ? 'block' : 'none';
  });
  if (view === 'wishlist') renderWishlist();
  if (view === 'cart') renderCart();
}

async function setupCheckout() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const cart = read(CART, []);
    if (!cart.length) {
      showToast('السلة فارغة', 'error');
      return;
    }

    if (!auth.currentUser) {
      location.href = 'login.html?return=products.html';
      return;
    }

    try {
      const order = {
        orderId: `ORD-${Date.now()}`,
        userId: auth.currentUser.uid,
        customerName: document.getElementById('cust-name')?.value.trim(),
        customerPhone: document.getElementById('cust-phone')?.value.trim(),
        customerEmail: document.getElementById('cust-email')?.value.trim(),
        city: document.getElementById('cust-city')?.value.trim(),
        address: document.getElementById('cust-address')?.value.trim(),
        products: cart,
        status: 'بانتظار الدفع',
        date: new Date().toISOString()
      };

      await set(push(ref(db, 'orders')), order);
      save(CART, []);
      updateGlobalBadges();
      renderCart();
      form.reset();
      showToast('تم إرسال الطلب بنجاح');
    } catch (error) {
      console.error(error);
      showToast('تعذر إرسال الطلب، تأكد من الاتصال وفirebase', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  updateGlobalBadges();
  renderCart();

  document.getElementById('btn-cart')?.addEventListener('click', () => showView('cart'));
  document.getElementById('btn-wishlist')?.addEventListener('click', () => showView('wishlist'));
  document.getElementById('back-to-store-1')?.addEventListener('click', () => showView('store'));
  document.getElementById('back-to-store-2')?.addEventListener('click', () => showView('store'));

  const searchInput = document.getElementById('store-search');
  const categorySelect = document.getElementById('filter-category');

  const filterProducts = () => {
    const value = (searchInput?.value || '').toLowerCase();
    const category = categorySelect?.value || 'all';
    return products.filter(product => {
      const matchesSearch = !value || `${product.name || ''} ${product.description || ''} ${product.specs || ''}`.toLowerCase().includes(value);
      const matchesCategory = category === 'all' || product.category === category;
      return matchesSearch && matchesCategory;
    });
  };

  searchInput?.addEventListener('input', () => renderProductCards(filterProducts()));
  categorySelect?.addEventListener('change', () => renderProductCards(filterProducts()));

  try {
    toggleSkeleton('products-grid', 6, true);
    await loadProducts();
    renderProductCards(products);
  } catch (error) {
    console.error(error);
    const grid = document.getElementById('products-grid');
    if (grid) grid.innerHTML = '<p>تعذر تحميل المنتجات حالياً. حاول تحديث الصفحة.</p>';
  } finally {
    toggleSkeleton('products-grid', 0, false);
  }

  setupCheckout();
});

export { addToCart, renderCart, loadProducts, showView };

















































































































































