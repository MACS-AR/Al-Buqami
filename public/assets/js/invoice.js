import { db, ref, get, child, showToast } from './firebase.js';

const byId = id => document.getElementById(id);
const money = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
function hideLoader() { const loader = byId('loading-screen'); if (loader) loader.style.display = 'none'; }
async function fetchInvoiceData(orderId) {
  const loader = byId('loading-screen'); if (loader) loader.style.display = 'flex';
  try { const snapshot = await get(child(ref(db), `invoices/${orderId}`)); if (!snapshot.exists()) throw new Error('missing'); renderInvoice(snapshot.val() || {}); }
  catch { showToast('لم يتم العثور على فاتورة لهذا الطلب أو تعذر الاتصال.', 'error'); }
  finally { hideLoader(); }
}
function renderInvoice(invoice) {
  const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  setText('lbl-invoice-id', invoice.invoiceId || `INV-${invoice.orderId || 'UNKNOWN'}`);
  const date = invoice.date ? new Date(invoice.date) : new Date(); setText('lbl-invoice-date', `التاريخ: ${Number.isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('ar-SA')}`);
  setText('lbl-cust-name', invoice.customerName || 'عميل كريم'); setText('lbl-cust-phone', `جوال: ${invoice.customerPhone || 'غير مسجل'}`); setText('lbl-cust-address', `المدينة: ${invoice.city || 'غير محددة'} - العنوان: ${invoice.address || 'توصيل للموقع'}`);
  const status = byId('lbl-invoice-status'); if (status) { status.textContent = invoice.status || 'بانتظار الدفع'; status.style.backgroundColor = invoice.status === 'مدفوعة' || invoice.status === 'تم التوصيل' ? '#2ecc71' : invoice.status === 'ملغي' ? '#e74c3c' : '#e67e22'; }
  const tbody = byId('invoice-items-body'); if (!tbody) return; tbody.replaceChildren(); let subtotal = 0;
  (Array.isArray(invoice.products) ? invoice.products : []).forEach(item => { const qty = Math.max(1, Number(item.quantity) || 1), unit = money(item.price), rowTotal = qty * unit; subtotal += rowTotal; const tr = document.createElement('tr'); [['name', item.name || 'منتج'], ['qty', String(qty)], ['unit', `${unit.toFixed(2)} ر.س`], ['total', `${rowTotal.toFixed(2)} ر.س`]].forEach(({ key, value }) => { const td = document.createElement('td'); td.textContent = value; td.style.cssText = 'padding:15px 12px;color:#fff'; if (key === 'qty' || key === 'unit') td.style.textAlign = 'center'; if (key === 'total') td.style.textAlign = 'left'; tr.appendChild(td); }); tbody.appendChild(tr); });
  const tax = subtotal * 0.15; setText('invoice-subtotal', `${subtotal.toFixed(2)} ر.س`); setText('invoice-tax', `${tax.toFixed(2)} ر.س`); setText('invoice-grand-total', `${(subtotal + tax).toFixed(2)} ر.س`);
  const qr = byId('invoice-qrcode'); if (qr && window.QRCode) { qr.replaceChildren(); new QRCode(qr, { text: `Al-Buqami|${invoice.invoiceId || invoice.orderId || ''}|${date.toISOString()}|${(subtotal + tax).toFixed(2)}|${tax.toFixed(2)}`, width: 100, height: 100, correctLevel: QRCode.CorrectLevel.H }); }
}
document.addEventListener('DOMContentLoaded', () => { const id = new URLSearchParams(location.search).get('orderId'); const input = byId('input-search-invoice'); if (id && input) { input.value = id; fetchInvoiceData(id); } else hideLoader(); byId('btn-fetch-invoice')?.addEventListener('click', () => { const value = input?.value.trim(); if (value) fetchInvoiceData(value); else showToast('الرجاء إدخال رقم الطلب.', 'error'); }); });
