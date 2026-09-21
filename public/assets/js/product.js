import { db, ref, get, child, showToast, updateGlobalBadges } from './assets/js/firebase.js';

const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const categoryName = { tracking: 'أجهزة تتبع', security: 'أنظمة حماية', iot: 'إنترنت الأشياء' };
const cartKey = 'albuqami_cart';
const wishKey = 'albuqami_wishlist';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

let product = null;
const id = new URLSearchParams(location.search).get('id');
const setText = (elementId, value) => { const element = document.getElementById(elementId); if (element) element.textContent = value; };

async function loadProduct() {
  if (!id) { location.replace('products.html'); return; }
  try {
    const snapshot = await get(child(ref(db), `products/${id}`));
    if (!snapshot.exists()) throw new Error('missing');
    product = { id, ...(snapshot.val() || {}) };
    const price = money(product.price);
    setText('product-name', product.name || 'منتج');
    setText('product-badge', categoryName[product.category] || 'أجهزة وحلول ذكية');
    setText('product-sku', `رقم المنتج: ${product.sku || id.slice(0, 8).toUpperCase()}`);
    setText('product-price', `${price.toFixed(2)} ر.س`);
    setText('product-old-price', product.oldPrice && money(product.oldPrice) > price ? `${money(product.oldPrice).toFixed(2)} ر.س` : '');
    setText('product-description', product.description || product.desc || 'لا يوجد وصف متوفر حالياً.');
    setText('product-specs', product.specs || product.description || product.desc || 'لا توجد مواصفات إضافية.');
    setText('product-warranty', product.warranty || 'ضمان الوكيل المعتمد');
    setText('product-status', Number(product.qty ?? 0) > 0 ? `متوفر (${product.qty})` : 'غير متوفر حالياً');
    const image = product.image || product.img || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : '') || 'assets/logo1.png';
    const mainImage = document.getElementById('main-product-img');
    if (mainImage) { mainImage.src = image; mainImage.alt = product.name || 'منتج'; }
  } catch (error) {
    console.error(error); showToast('المنتج غير موجود أو تعذر تحميله', 'error'); setTimeout(() => location.replace('products.html'), 1200);
  } finally { document.getElementById('loading-screen')?.style && (document.getElementById('loading-screen').style.display = 'none'); }
}

function addToCart() {
  if (!product) return;
  const cart = read(cartKey, []); const found = cart.find(item => item.id === product.id);
  const image = product.image || product.img || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : '') || 'assets/logo1.png';
  if (found) found.quantity = (Number(found.quantity) || 1) + 1;
  else cart.push({ id: product.id, name: product.name || 'منتج', price: money(product.price), image, quantity: 1 });
  localStorage.setItem(cartKey, JSON.stringify(cart)); updateGlobalBadges(); showToast('تمت إضافة المنتج للسلة');
}
function addToWishlist() {
  if (!product) return;
  const list = read(wishKey, []); if (list.includes(product.id)) return showToast('المنتج موجود بالفعل بالمفضلة', 'error');
  list.push(product.id); localStorage.setItem(wishKey, JSON.stringify(list)); updateGlobalBadges(); showToast('تمت الإضافة للمفضلة');
}
document.addEventListener('DOMContentLoaded', () => { document.getElementById('btn-add-to-cart-page')?.addEventListener('click', addToCart); document.getElementById('btn-add-to-wishlist-page')?.addEventListener('click', addToWishlist); loadProduct(); });