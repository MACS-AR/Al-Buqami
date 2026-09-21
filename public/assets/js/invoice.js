import { db, ref, get, child, showToast, auth, onAuthStateChanged } from './firebase.js';

const byId = id => document.getElementById(id);
const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
let currentInvoice = null;

function render(invoice) {
  currentInvoice = invoice;
  const text = (id, value) => { const element = byId(id); if (element) element.textContent = value; };
  const date = invoice.date ? new Date(invoice.date) : new Date();
  const validDate = !Number.isNaN(date.getTime());
  text('lbl-invoice-id', invoice.invoiceId || `INV-${invoice.orderId || 'UNKNOWN'}`);
  text('lbl-invoice-date', `التاريخ: ${validDate ? date.toLocaleDateString('ar-SA') : 'غير محدد'}`);
  text('lbl-cust-name', invoice.customerName || 'عميل كريم');
  text('lbl-cust-phone', `جوال: ${invoice.customerPhone || 'غير مسجل'}`);
  text('lbl-cust-address', `العنوان: ${invoice.address || 'غير مسجل'}`);

  const status = byId('lbl-invoice-status');
  if (status) {
    status.textContent = invoice.status || 'بانتظار الدفع';
    status.style.backgroundColor = ['مدفوعة', 'تم التوصيل'].includes(invoice.status) ? '#2ecc71' : '#e67e22';
  }

  const body = byId('invoice-items-body');
  if (body) {
    body.replaceChildren();
    (Array.isArray(invoice.products) ? invoice.products : []).forEach(item => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unit = money(item.price);
      const total = quantity * unit;
      const row = document.createElement('tr');
      row.innerHTML = `<td style="padding:12px">${escapeHtml(item.name || 'منتج')}</td><td style="padding:12px;text-align:center">${quantity}</td><td style="padding:12px;text-align:center">${unit.toFixed(2)} ر.س</td><td style="padding:12px;text-align:left">${total.toFixed(2)} ر.س</td>`;
      body.appendChild(row);
    });
  }
  const subtotal = (Array.isArray(invoice.products) ? invoice.products : []).reduce((sum, item) => sum + money(item.price) * Math.max(1, Number(item.quantity) || 1), 0);
  const tax = subtotal * 0.15;
  text('invoice-subtotal', `${subtotal.toFixed(2)} ر.س`);
  text('invoice-tax', `${tax.toFixed(2)} ر.س`);
  text('invoice-grand-total', `${(subtotal + tax).toFixed(2)} ر.س`);
  const qr = byId('invoice-qrcode');
  if (qr && window.QRCode) { qr.replaceChildren(); new QRCode(qr, { text: `Al-Buqami|${invoice.invoiceId || invoice.orderId || ''}|${(subtotal + tax).toFixed(2)}`, width: 120, height: 120 }); }
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

function luxuryPrint(invoice) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const subtotal = products.reduce((sum, item) => sum + money(item.price) * Math.max(1, Number(item.quantity) || 1), 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;
  const date = invoice.date ? new Date(invoice.date) : new Date();
  const rows = products.map(item => { const quantity = Math.max(1, Number(item.quantity) || 1); const unit = money(item.price); return `<tr><td>${escapeHtml(item.name || 'منتج')}</td><td>${quantity}</td><td>${unit.toFixed(2)} ر.س</td><td>${(unit * quantity).toFixed(2)} ر.س</td></tr>`; }).join('');
  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) return showToast('اسمح بفتح النوافذ المنبثقة لطباعة الفاتورة', 'error');
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${escapeHtml(invoice.invoiceId || invoice.orderId || '')}</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"><style>
  :root{--bg:#090d16;--card:#111726;--gold:#f5c842;--royal:#dbb339;--muted:#94a3b8;--border:rgba(219,179,57,.3)}*{box-sizing:border-box;font-family:Cairo,sans-serif}html,body{margin:0;background:var(--bg);color:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:190mm;min-height:277mm;margin:20px auto;padding:14mm 15mm;background:var(--card);border:2px solid var(--royal);border-radius:20px;box-shadow:0 15px 40px #0009;display:flex;flex-direction:column}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px dashed var(--border);padding-bottom:15px}.logo{width:70px;height:70px;object-fit:contain;border:2px solid var(--gold);border-radius:50%;padding:4px}.title{color:var(--gold);font-size:25px;font-weight:900;margin:5px 0}.muted{color:var(--muted);font-size:12px}.invoice-id{color:var(--gold);font-size:18px;font-weight:900;direction:ltr}.customer{margin:22px 0;padding:15px;background:#141c2e;border-right:5px solid var(--royal);border-radius:8px}.customer h2{color:var(--gold);font-size:18px;margin:0 0 10px}.customer strong{font-size:19px}.customer p{margin:5px 0;color:#cbd5e1}.table{width:100%;border-collapse:collapse;margin-top:12px}.table th,.table td{border:1px solid var(--border);padding:10px;text-align:center}.table th{background:#1e2942;color:var(--gold)}.table td{background:#141c2e}.totals{margin-top:22px;margin-right:auto;width:330px;border-top:1px solid var(--border);padding-top:12px}.totals div{display:flex;justify-content:space-between;padding:5px}.grand{color:var(--gold);font-size:20px;font-weight:900;border-top:1px solid var(--border);margin-top:7px;padding-top:10px}.footer{margin-top:auto;border-top:1px solid var(--border);padding-top:12px;text-align:center;color:var(--gold);font-size:12px}@page{size:A4 portrait;margin:0}@media print{body{background:var(--bg)}.page{width:210mm;height:297mm;min-height:297mm;margin:0;border:0;border-radius:0;box-shadow:none;padding:15mm 20mm}}
  </style></head><body><main class="page"><header class="header"><div><img class="logo" src="https://raw.githubusercontent.com/MACS-AR/Al-Buqami/refs/heads/main/public/assets/logo1.png"><h1 class="title">فاتورة المشتريات</h1><p class="muted">مؤسسة البقمي للحلول الذكية</p><p class="muted">سجل تجاري: 1010XXXXXX | الرقم الضريبي: 310XXXXXXXXXXXX</p></div><div><div class="invoice-id">${escapeHtml(invoice.invoiceId || `INV-${invoice.orderId || ''}`)}</div><p class="muted">${date.toLocaleDateString('ar-SA')}</p><p class="muted">الحالة: ${escapeHtml(invoice.status || 'بانتظار الدفع')}</p></div></header><section class="customer"><h2>بيانات العميل</h2><strong>${escapeHtml(invoice.customerName || 'عميل كريم')}</strong><p>الجوال: ${escapeHtml(invoice.customerPhone || 'غير مسجل')}</p><p>البريد الإلكتروني: ${escapeHtml(invoice.customerEmail || 'غير مسجل')}</p><p>العنوان: ${escapeHtml(invoice.address || 'غير مسجل')}</p></section><h2 class="title" style="font-size:19px">تفاصيل الفاتورة</h2><table class="table"><thead><tr><th>المنتج / البيان</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows || '<tr><td colspan="4">لا توجد منتجات</td></tr>'}</tbody></table><section class="totals"><div><span>المجموع الفرعي</span><b>${subtotal.toFixed(2)} ر.س</b></div><div><span>ضريبة القيمة المضافة (15%)</span><b>${tax.toFixed(2)} ر.س</b></div><div class="grand"><span>الإجمالي النهائي</span><b>${total.toFixed(2)} ر.س</b></div></section><footer class="footer">نشكر لكم اختياركم مؤسسة البقمي — هذه الفاتورة إلكترونية وقابلة للطباعة أو الحفظ كـ PDF</footer></main><script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  popup.document.close();
}

async function fetchInvoice(id, user) {
  if (!id) return showToast('أدخل رقم الطلب', 'error');
  try {
    const snapshot = await get(child(ref(db), `invoices/${id}`));
    const invoice = snapshot.val();
    if (!snapshot.exists() || !invoice.userId || invoice.userId !== user.uid) throw new Error('forbidden');
    render(invoice);
    document.getElementById('luxury-print-btn')?.remove();
    const nativePrint = document.querySelector('#invoice-print-area')?.closest('main')?.querySelector('button[onclick*="print"]');
    if (nativePrint) { const button = document.createElement('button'); button.id = 'luxury-print-btn'; button.className = 'btn-gold'; button.innerHTML = '<i class="fa-solid fa-file-invoice"></i> طباعة بتصميم العرض'; button.onclick = () => luxuryPrint(currentInvoice); nativePrint.parentElement.appendChild(button); }
  } catch { showToast('الفاتورة غير موجودة أو لا تخص حسابك', 'error'); }
  finally { const loader = document.getElementById('loading-screen'); if (loader) loader.style.display = 'none'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const input = byId('input-search-invoice');
  const button = byId('btn-fetch-invoice');
  onAuthStateChanged(auth, user => {
    if (!user) { showToast('سجل الدخول لعرض فواتيرك', 'error'); setTimeout(() => location.href = 'login.html?return=invoice.html', 800); return; }
    button?.addEventListener('click', () => fetchInvoice(input?.value.trim(), user));
    const id = new URLSearchParams(location.search).get('orderId');
    if (id) { if (input) input.value = id; fetchInvoice(id, user); }
    else { const loader = document.getElementById('loading-screen'); if (loader) loader.style.display = 'none'; }
  });
});
