const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FIREBASE_URL = (process.env.FIREBASE_DATABASE_URL || 'https://sr-test-c9e06-default-rtdb.firebaseio.com').replace(/\/$/, '');
const publicDir = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.static(publicDir, { extensions: ['html'] }));
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel'), { extensions: ['html'] }));

const defaults = {
  logoText: 'مؤسسة مناحي البقمي',
  logoImgUrl: '/assets/logo1.png',
  heroTitle: 'مؤسسة مناحي البقمي للخدمات والحلول المتكاملة',
  heroDesc: 'حلول لوجستية وتجارية وتقنية موثوقة، من تتبع المركبات إلى التخليص الجمركي وإنترنت الأشياء.',
  bgUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80',
  footerText: 'جميع الحقوق محفوظة © مؤسسة مناحي البقمي 2026'
};

function clean(value, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 5000) : fallback;
}
function normalizePhone(value) { return clean(value).replace(/[^\d+]/g, ''); }
async function firebase(pathname, options = {}) {
  const response = await fetch(`${FIREBASE_URL}/${pathname.replace(/^\//, '')}.json`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`Firebase returned ${response.status}`);
  return response.json();
}
function asList(data) {
  if (!data || typeof data !== 'object') return [];
  return Array.isArray(data) ? data : Object.entries(data).map(([id, value]) => ({ id, ...(value || {}) })).reverse();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'albuqami' }));
app.get('/api/site-settings', async (_req, res) => {
  try {
    let settings = await firebase('settings');
    if (!settings) { settings = defaults; await firebase('settings', { method: 'PUT', body: JSON.stringify(settings) }); }
    res.json({ ...defaults, ...settings });
  } catch { res.json(defaults); }
});
app.post('/api/site-settings/update', async (req, res) => {
  const body = req.body || {};
  const settings = {
    logoText: clean(body.logoText, defaults.logoText), logoImgUrl: clean(body.logoImgUrl, defaults.logoImgUrl),
    heroTitle: clean(body.heroTitle, defaults.heroTitle), heroDesc: clean(body.heroDesc, defaults.heroDesc),
    bgUrl: clean(body.bgUrl, defaults.bgUrl), footerText: clean(body.footerText, defaults.footerText)
  };
  try { await firebase('settings', { method: 'PUT', body: JSON.stringify(settings) }); res.json({ success: true, settings }); }
  catch { res.status(502).json({ success: false, error: 'تعذر حفظ الإعدادات' }); }
});

app.get('/api/visits', async (_req, res) => { try { res.json({ count: Number(await firebase('visits')) || 0 }); } catch { res.json({ count: 0 }); } });
app.post('/api/visits/increment', async (_req, res) => {
  try { const count = (Number(await firebase('visits')) || 0) + 1; await firebase('visits', { method: 'PUT', body: JSON.stringify(count) }); res.json({ success: true, count }); }
  catch { res.status(502).json({ success: false }); }
});

app.get('/api/bookings', async (_req, res) => { try { res.json(asList(await firebase('bookings'))); } catch { res.status(502).json({ error: 'تعذر تحميل الطلبات' }); } });
app.post('/api/bookings', async (req, res) => {
  const body = req.body || {};
  const clientName = clean(body.clientName), clientPhone = normalizePhone(body.clientPhone), details = clean(body.details);
  if (!clientName || clientPhone.length < 8 || !details) return res.status(400).json({ success: false, error: 'الاسم والجوال والتفاصيل مطلوبة' });
  const booking = { bookingId: `BQ-${Date.now().toString().slice(-8)}`, clientName, clientPhone, serviceType: clean(body.serviceType, 'خدمات عامة'), details, status: 'قيد المراجعة', adminPrice: 'لم يحدد بعد', adminDuration: 'تحت الدراسة', requiredPapers: 'جاري مراجعة الطلب.', adminNotes: 'سيتم التواصل معكم بعد دراسة الطلب.', date: new Date().toISOString() };
  try { const result = await firebase('bookings', { method: 'POST', body: JSON.stringify(booking) }); res.status(201).json({ success: true, bookingId: booking.bookingId, id: result && result.name }); }
  catch { res.status(502).json({ success: false, error: 'تعذر حفظ الطلب' }); }
});
app.patch('/api/bookings/:id', async (req, res) => { try { await firebase(`bookings/${encodeURIComponent(req.params.id)}`, { method: 'PATCH', body: JSON.stringify(req.body || {}) }); res.json({ success: true }); } catch { res.status(502).json({ success: false }); } });
app.delete('/api/bookings/:id', async (req, res) => { try { await firebase(`bookings/${encodeURIComponent(req.params.id)}`, { method: 'DELETE' }); res.json({ success: true }); } catch { res.status(502).json({ success: false }); } });

app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
if (require.main === module) app.listen(PORT, () => console.log(`Al-Buqami running on ${PORT}`));
module.exports = app;
