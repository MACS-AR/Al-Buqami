import { auth, onAuthStateChanged, signOut, db, ref, get, child, update, remove, set, push, showToast } from './firebase.js';

const $ = id => document.getElementById(id);
const asEntries = value => value && typeof value === 'object' ? Object.entries(value) : [];
const read = async path => {
  const snapshot = await get(child(ref(db), path));
  return snapshot.exists() ? snapshot.val() : {};
};
const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const total = order => (order.products || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0) * 1.15;

function renderProducts(data) {
  const body = $('admin-products-table');
  if (!body) return;
  const rows = asEntries(data).map(([id, p]) => `
    <tr>
      <td><img src="${p.image || p.imageUrl || 'assets/logo1.png'}" width="45" height="45" style="object-fit:cover;border-radius:8px;" alt="${p.name || 'منتج'}"></td>
      <td>${p.name || '-'}</td>
      <td>${money(p.price).toFixed(2)} ر.س</td>
      <td>${(p.description || p.specs || '-').slice(0, 80)}</td>
      <td><button class="btn-outline delete-product" data-id="${id}">حذف</button></td>
    </tr>
  `).join('') || '<tr><td colspan="5">لا توجد منتجات.</td></tr>';

  body.innerHTML = rows;
  body.querySelectorAll('.delete-product').forEach(button => {
    button.onclick = async () => {
      if (!confirm('حذف هذا المنتج؟')) return;
      await remove(ref(db, `products/${button.dataset.id}`));
      await load();
    };
  });
}

function renderOrders(data) {
  const body = $('admin-orders-table');
  if (!body) return;
  const rows = asEntries(data).map(([id, o]) => `
    <tr>
      <td>${o.orderId || id}</td>
      <td>${o.customerName || '-'}</td>
      <td>${o.customerPhone || '-'}</td>
      <td>${o.date ? new Date(o.date).toLocaleDateString('ar-SA') : '-'}</td>
      <td>${total(o).toFixed(2)} ر.س</td>
      <td>
        <select class="order-status" data-id="${id}">
          <option value="بانتظار الدفع" ${o.status === 'بانتظار الدفع' ? 'selected' : ''}>بانتظار الدفع</option>
          <option value="مدفوعة" ${o.status === 'مدفوعة' ? 'selected' : ''}>مدفوعة</option>
          <option value="تم التوصيل" ${o.status === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option>
          <option value="ملغاة" ${o.status === 'ملغاة' ? 'selected' : ''}>ملغاة</option>
        </select>
      </td>
      <td><button class="btn-outline delete-order" data-id="${id}">حذف</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7">لا توجد طلبات.</td></tr>';

  body.innerHTML = rows;
  body.querySelectorAll('.order-status').forEach(select => {
    select.onchange = async () => {
      await update(ref(db, `orders/${select.dataset.id}`), { status: select.value });
      await load();
    };
  });

  body.querySelectorAll('.delete-order').forEach(button => {
    button.onclick = async () => {
      if (!confirm('حذف هذا الطلب؟')) return;
      await remove(ref(db, `orders/${button.dataset.id}`));
      await load();
    };
  });
}

function renderStats(orders, products) {
  const list = asEntries(orders).map(([, value]) => value);
  const sales = list.filter(o => ['مدفوعة', 'تم التوصيل'].includes(o.status)).reduce((sum, o) => sum + total(o), 0);
  const salesEl = $('stat-total-sales');
  const countEl = $('stat-orders');
  const productCountEl = $('stat-products');

  if (salesEl) salesEl.textContent = `${sales.toFixed(2)} ر.س`;
  if (countEl) countEl.textContent = String(list.length);
  if (productCountEl) productCountEl.textContent = String(asEntries(products).length);
}

async function load() {
  try {
    const [orders, products] = await Promise.all([read('orders'), read('products')]);
    renderOrders(orders);
    renderProducts(products);
    renderStats(orders, products);
    if ($('loading-screen')) $('loading-screen').style.display = 'none';
  } catch (error) {
    console.error(error);
    showToast('تعذر تحميل بيانات لوحة الإدارة', 'error');
  }
}

async function addProduct(event) {
  event.preventDefault();

  const name = $('p-name')?.value.trim();
  const price = Number($('p-price')?.value);
  const image = $('p-image')?.value.trim() || '';
  const description = $('p-desc')?.value.trim() || '';
  const category = $('p-category')?.value || 'tracking';
  const qty = Number($('p-qty')?.value) || 1;

  if (!name || !Number.isFinite(price) || price < 0) {
    showToast('أدخل اسم المنتج وسعره بشكل صحيح', 'error');
    return;
  }

  const newProduct = {
    id: `${Date.now()}`,
    name,
    price,
    image,
    description,
    category,
    qty,
    specs: description,
    createdAt: new Date().toISOString()
  };

  const productRef = push(ref(db, 'products'));
  await set(productRef, newProduct);

  if ($('add-product-form')) $('add-product-form').reset();
  showToast('تمت إضافة المنتج بنجاح');
  await load();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.admin-pane').forEach(panel => panel.style.display = 'none');
      const target = $(tab.dataset.target);
      if (target) target.style.display = 'block';
      document.querySelectorAll('.admin-tab').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
    };
  });

  $('btn-logout')?.addEventListener('click', () => signOut(auth).then(() => location.replace('index.html')));
  $('btn-open-add-product')?.addEventListener('click', () => {
    const panel = $('add-product-form');
    if (panel) panel.style.display = 'block';
  });
  $('btn-cancel-product')?.addEventListener('click', () => {
    const form = $('add-product-form');
    if (form) form.reset();
    if (form) form.style.display = 'none';
  });
  $('add-product-form')?.addEventListener('submit', addProduct);
});

onAuthStateChanged(auth, async user => {
  if (!user) return location.replace('admin-login.html');

  try {
    const profile = await get(child(ref(db), `users/${user.uid}`));
    const allowed = user.email === 'admin@albuqami.com' || (profile.exists() && profile.val().role === 'admin');
    if (!allowed) {
      showToast('ليس لديك صلاحية دخول لوحة الإدارة', 'error');
      await signOut(auth);
      return location.replace('login.html');
    }

    await load();
  } catch (error) {
    console.error(error);
    showToast('تعذر التحقق من صلاحيات الإدارة', 'error');
  }
});

export { load, addProduct };













































































































































