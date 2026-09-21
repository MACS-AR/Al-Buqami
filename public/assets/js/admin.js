import { auth, onAuthStateChanged, signOut, db, ref, get, child, update, remove, set, showToast } from './firebase.js';

const $ = id => document.getElementById(id);
let isAdmin = false;

onAuthStateChanged(auth, async user => {
  if (!user) return location.replace('admin-login.html');
  try {
    const profile = await get(child(ref(db), `users/${user.uid}`));
    isAdmin = user.email === 'admin@albuqami.com' || (profile.exists() && profile.val().role === 'admin');
  } catch { isAdmin = user.email === 'admin@albuqami.com'; }
  if (!isAdmin) { showToast('ليس لديك صلاحية دخول لوحة الإدارة', 'error'); await signOut(auth); return location.replace('login.html'); }
  loadDashboardData();
});

document.addEventListener('DOMContentLoaded', () => {
  $('loading-screen') && ($('loading-screen').style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.tab-content').forEach(x => x.style.display = 'none'); document.querySelectorAll('.tab-btn').forEach(x => x.className = x.className.replace('btn-gold', 'btn-outline')); $(button.dataset.target).style.display = 'block'; button.className = button.className.replace('btn-outline', 'btn-gold'); }));
  $('btn-logout')?.addEventListener('click', () => signOut(auth).then(() => location.replace('index.html')));
  $('btn-open-add-product')?.addEventListener('click', () => { $('add-product-wrapper').style.display = 'block'; });
  $('btn-cancel-product')?.addEventListener('click', () => { $('add-product-wrapper').style.display = 'none'; });
  $('add-product-form')?.addEventListener('submit', addNewProduct);
});

async function read(path) { const snapshot = await get(child(ref(db), path)); return snapshot.exists() ? snapshot.val() : {}; }
async function loadDashboardData() { try { const [orders, products, rfqs] = await Promise.all([read('orders'), read('products'), read('rfqs')]); calculateStats(orders, products, rfqs); renderOrders(orders); renderProducts(products); renderRFQs(rfqs); } catch { showToast('تعذر تحميل بيانات لوحة الإدارة', 'error'); } }
function total(o) { return (o.products || []).reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0) * 1.15; }
function calculateStats(orders, products, rfqs) { let sales = 0, active = 0; Object.values(orders).forEach(o => { if (['مدفوعة', 'تم التوصيل'].includes(o.status)) sales += total(o); if (!['تم التوصيل', 'ملغي'].includes(o.status)) active++; }); $('stat-total-sales').textContent = `${sales.toFixed(2)} ر.س`; $('stat-active-orders').textContent = active; $('stat-pending-rfqs').textContent = Object.values(rfqs).filter(r => !['مقبول', 'مرفوض'].includes(r.status)).length; $('stat-total-products').textContent = Object.keys(products).length; }
function renderOrders(orders) { const body = $('admin-orders-table'); if (!body) return; body.replaceChildren(); Object.entries(orders).forEach(([id, order]) => { const row = document.createElement('tr'); row.innerHTML = `<td>${order.orderId || id}</td><td>${order.customerName || '--'}</td><td>${order.customerPhone || '--'}</td><td>${order.date ? new Date(order.date).toLocaleDateString('ar-SA') : '--'}</td><td>${total(order).toFixed(2)} ر.س</td><td><select class="order-status"><option ${order.status === 'بانتظار الدفع' ? 'selected' : ''}>بانتظار الدفع</option><option ${order.status === 'مدفوعة' ? 'selected' : ''}>مدفوعة</option><option ${order.status === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option><option ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option></select><input class="admin-reply" value="${String(order.adminReply || '').replace(/"/g, '&quot;')}" placeholder="رد الإدارة"></td><td><button class="btn-gold save-order">حفظ</button></td>`; row.querySelector('.save-order').onclick = async () => { await update(ref(db, `orders/${id}`), { status: row.querySelector('.order-status').value, adminReply: row.querySelector('.admin-reply').value.trim() }); await update(ref(db, `invoices/${order.orderId || id}`), { status: row.querySelector('.order-status').value }); showToast('تم تحديث الطلب'); }; body.appendChild(row); }); }
function renderProducts(products) { const body = $('admin-products-table'); if (!body) return; body.replaceChildren(); Object.entries(products).forEach(([id, p]) => { const row = document.createElement('tr'); row.innerHTML = `<td><img src="${p.image || ''}" style="width:55px;height:45px;object-fit:contain"></td><td>${p.name || '--'}</td><td>${Number(p.price || 0).toFixed(2)} ر.س</td><td>${p.description || ''}</td><td><button class="btn-outline delete-product">حذف</button></td>`; row.querySelector('.delete-product').onclick = async () => { if (confirm('حذف المنتج؟')) { await remove(ref(db, `products/${id}`)); row.remove(); showToast('تم حذف المنتج'); } }; body.appendChild(row); }); }
function renderRFQs(rfqs) { const body = $('admin-rfqs-table'); if (!body) return; body.replaceChildren(); Object.entries(rfqs).forEach(([id, r]) => { const row = document.createElement('tr'); row.innerHTML = `<td>${r.id || id}</td><td>${r.clientName || '--'}</td><td>${r.clientPhone || '--'}</td><td>${r.serviceType || '--'}</td><td>${r.details || '--'}</td><td>${r.date || '--'}</td><td>${r.status || 'قيد الدراسة'}</td><td><button class="btn-gold accept-rfq">قبول</button><button class="btn-outline reject-rfq">رفض</button></td>`; row.querySelector('.accept-rfq').onclick = () => update(ref(db, `rfqs/${id}`), { status: 'مقبول' }); row.querySelector('.reject-rfq').onclick = () => update(ref(db, `rfqs/${id}`), { status: 'مرفوض' }); body.appendChild(row); }); }
async function addNewProduct(event) { event.preventDefault(); const name = $('p-name').value.trim(), price = Number($('p-price').value), image = $('p-image').value.trim(), description = $('p-desc').value.trim(); if (!name || !Number.isFinite(price) || !description) return showToast('أكمل بيانات المنتج', 'error'); const key = pushKey(); await set(ref(db, `products/${key}`), { name, price, image, description, createdAt: new Date().toISOString() }); event.target.reset(); $('add-product-wrapper').style.display = 'none'; showToast('تمت إضافة المنتج'); loadDashboardData(); }
function pushKey() { return `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
