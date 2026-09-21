import { auth, onAuthStateChanged, signOut, db, ref, get, child, update, remove, set, push, showToast } from './firebase.js';

const $ = id => document.getElementById(id);
const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const entries = value => value && typeof value === 'object' ? Object.entries(value) : [];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const read = async path => {
  const snapshot = await get(child(ref(db), path));
  return snapshot.exists() ? snapshot.val() : {};
};

let products = {};
let busy = false;

function ensureProductFields() {
  const form = $('add-product-form');
  if (!form || $('p-category')) return;
  const image = $('p-image');
  const description = $('p-desc');
  const fields = document.createElement('div');
  fields.className = 'product-grid';
  fields.innerHTML = `
    <div class="form-group"><label for="p-category">التصنيف</label>
      <select id="p-category" class="form-control"><option value="tracking">أجهزة تتبع</option><option value="security">أنظمة حماية</option><option value="iot">إنترنت الأشياء</option></select>
    </div>
    <div class="form-group"><label for="p-qty">الكمية المتوفرة</label>
      <input id="p-qty" class="form-control" type="number" min="0" step="1" value="1">
    </div>`;
  (image?.closest('.form-group') || description || form).after(fields);
}

function renderProducts(data) {
  products = data || {};
  const body = $('admin-products-table');
  if (!body) return;
  const rows = entries(products).map(([id, product]) => {
    const p = product || {};
    return `<tr>
      <td><img src="${escapeHtml(p.image || p.img || p.imageUrl || 'assets/logo1.png')}" width="45" height="45" style="object-fit:cover;border-radius:8px" alt="${escapeHtml(p.name || 'منتج')}"></td>
      <td>${escapeHtml(p.name || '-')}</td>
      <td>${money(p.price).toFixed(2)} ر.س</td>
      <td>${escapeHtml(p.category || '-')} · ${Number(p.qty ?? 0)} قطعة</td>
      <td><button type="button" class="btn-outline edit-product" data-id="${escapeHtml(id)}">تعديل</button> <button type="button" class="btn-outline delete-product" data-id="${escapeHtml(id)}">حذف</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5">لا توجد منتجات حتى الآن.</td></tr>';
  body.innerHTML = rows;

  body.querySelectorAll('.delete-product').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return;
    try { await remove(ref(db, `products/${button.dataset.id}`)); showToast('تم حذف المنتج'); await load(); }
    catch (error) { console.error(error); showToast('تعذر حذف المنتج', 'error'); }
  }));
  body.querySelectorAll('.edit-product').forEach(button => button.addEventListener('click', () => editProduct(button.dataset.id)));
}

function renderOrders(data) {
  const body = $('admin-orders-table');
  if (!body) return;
  const rows = entries(data).map(([id, order]) => {
    const o = order || {};
    const total = (Array.isArray(o.products) ? o.products : []).reduce((sum, item) => sum + money(item.price) * Math.max(1, Number(item.quantity) || 1), 0) * 1.15;
    return `<tr><td>${escapeHtml(o.orderId || id)}</td><td>${escapeHtml(o.customerName || '-')}</td><td>${escapeHtml(o.customerPhone || '-')}</td><td>${o.date ? new Date(o.date).toLocaleDateString('ar-SA') : '-'}</td><td>${total.toFixed(2)} ر.س</td><td><select class="order-status" data-id="${escapeHtml(id)}"><option ${o.status === 'بانتظار الدفع' ? 'selected' : ''}>بانتظار الدفع</option><option ${o.status === 'مدفوعة' ? 'selected' : ''}>مدفوعة</option><option ${o.status === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option><option ${o.status === 'ملغاة' ? 'selected' : ''}>ملغاة</option></select></td><td><button type="button" class="btn-outline delete-order" data-id="${escapeHtml(id)}">حذف</button></td></tr>`;
  }).join('') || '<tr><td colspan="7">لا توجد طلبات.</td></tr>';
  body.innerHTML = rows;
  body.querySelectorAll('.order-status').forEach(select => select.addEventListener('change', async () => { await update(ref(db, `orders/${select.dataset.id}`), { status: select.value }); showToast('تم تحديث حالة الطلب'); }));
  body.querySelectorAll('.delete-order').forEach(button => button.addEventListener('click', async () => { if (confirm('حذف الطلب؟')) { await remove(ref(db, `orders/${button.dataset.id}`)); await load(); } }));
}

function renderStats(orders, productData) {
  const orderList = entries(orders).map(([, value]) => value || {});
  const sales = orderList.filter(order => ['مدفوعة', 'تم التوصيل'].includes(order.status)).reduce((sum, order) => sum + (Array.isArray(order.products) ? order.products : []).reduce((x, p) => x + money(p.price) * Math.max(1, Number(p.quantity) || 1), 0) * 1.15, 0);
  if ($('stat-total-sales')) $('stat-total-sales').textContent = `${sales.toFixed(2)} ر.س`;
  if ($('stat-orders')) $('stat-orders').textContent = String(orderList.length);
  if ($('stat-products')) $('stat-products').textContent = String(entries(productData).length);
}

async function load() {
  try {
    const [orders, productData] = await Promise.all([read('orders'), read('products')]);
    renderOrders(orders); renderProducts(productData); renderStats(orders, productData);
    if ($('loading-screen')) $('loading-screen').style.display = 'none';
  } catch (error) { console.error(error); showToast('تعذر تحميل البيانات. تحقق من قواعد Firebase.', 'error'); }
}

function editProduct(id) {
  const product = products[id];
  if (!product) return;
  ensureProductFields();
  $('add-product-form').dataset.editId = id;
  $('p-name').value = product.name || '';
  $('p-price').value = product.price ?? '';
  $('p-image').value = product.image || product.img || product.imageUrl || '';
  $('p-desc').value = product.description || product.desc || product.specs || '';
  if ($('p-category')) $('p-category').value = product.category || 'tracking';
  if ($('p-qty')) $('p-qty').value = product.qty ?? 0;
  $('add-product-form').style.display = 'block';
  $('add-product-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function addProduct(event) {
  event.preventDefault();
  if (busy) return;
  ensureProductFields();
  const form = event.currentTarget;
  const name = $('p-name')?.value.trim();
  const price = Number($('p-price')?.value);
  const qty = Number($('p-qty')?.value ?? 0);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 0) { showToast('أدخل الاسم والسعر والكمية بشكل صحيح', 'error'); return; }
  busy = true;
  const product = { name, price, qty, category: $('p-category')?.value || 'tracking', image: $('p-image')?.value.trim() || '', description: $('p-desc')?.value.trim() || '', specs: $('p-desc')?.value.trim() || '', updatedAt: new Date().toISOString() };
  try {
    const editId = form.dataset.editId;
    if (editId) { await update(ref(db, `products/${editId}`), product); showToast('تم تعديل المنتج بنجاح'); }
    else { const productRef = push(ref(db, 'products')); await set(productRef, { ...product, createdAt: product.updatedAt }); showToast('تمت إضافة المنتج بنجاح'); }
    form.reset(); delete form.dataset.editId; if ($('p-qty')) $('p-qty').value = 1; form.style.display = 'none'; await load();
  } catch (error) { console.error(error); showToast('فشل الحفظ. تأكد من صلاحية الكتابة في Firebase.', 'error'); }
  finally { busy = false; }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureProductFields();
  document.querySelectorAll('.admin-tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.admin-pane').forEach(panel => panel.style.display = 'none'); $(tab.dataset.target) && ($(tab.dataset.target).style.display = 'block'); document.querySelectorAll('.admin-tab').forEach(item => item.classList.remove('active')); tab.classList.add('active'); }));
  $('btn-logout')?.addEventListener('click', () => signOut(auth).then(() => location.replace('index.html')));
  $('btn-open-add-product')?.addEventListener('click', () => { ensureProductFields(); const form = $('add-product-form'); if (form) { delete form.dataset.editId; form.reset(); if ($('p-qty')) $('p-qty').value = 1; form.style.display = 'block'; form.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
  $('btn-cancel-product')?.addEventListener('click', () => { const form = $('add-product-form'); if (form) { form.reset(); delete form.dataset.editId; form.style.display = 'none'; } });
  $('add-product-form')?.addEventListener('submit', addProduct);
});

onAuthStateChanged(auth, async user => {
  if (!user) return location.replace('admin-login.html');
  try {
    const profile = await get(child(ref(db), `users/${user.uid}`));
    const allowed = user.email === 'admin@albuqami.com' || (profile.exists() && profile.val().role === 'admin');
    if (!allowed) { showToast('ليس لديك صلاحية دخول لوحة الإدارة', 'error'); await signOut(auth); return location.replace('login.html'); }
    await load();
  } catch (error) { console.error(error); showToast('تعذر التحقق من صلاحيات الإدارة', 'error'); }
});

export { load, addProduct };