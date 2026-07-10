const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔗 رابط قاعدة بيانات الفايربيز الخاص بك
const FIREBASE_URL = "https://sr-test-c9e06-default-rtdb.firebaseio.com/";

// دالات الاتصال والتحكم بالفايربيز
async function firebaseFetch(endpoint) {
    try {
        const response = await fetch(`${FIREBASE_URL}${endpoint}.json`);
        const data = await response.json();
        if (!data) return null;
        if (typeof data === 'object' && !Array.isArray(data)) {
            return Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        }
        return data;
    } catch (error) { return null; }
}

async function firebaseSave(endpoint, data) {
    try {
        const res = await fetch(`${FIREBASE_URL}${endpoint}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) { return null; }
}

async function firebaseSet(endpoint, data) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) { return false; }
}

async function firebaseUpdate(endpoint, id, data) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}/${id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) { return false; }
}

async function firebaseDelete(endpoint, id) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}/${id}.json`, { method: 'DELETE' });
        return true;
    } catch (error) { return false; }
}

// المجلدات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel')));

// ================= نظام إدارة محتوى الموقع (CMS) =================
app.get('/api/site-settings', async (req, res) => {
    let settings = await firebaseFetch('settings');
    if (!settings || Array.isArray(settings)) {
        // الإعدادات الافتراضية الملكية الفاخرة المعتمدة بناءً على النص واللوجو المختار
        const defaultSettings = {
            logoText: "مؤسسة البقمي",
            heroTitle: "مؤسسة البقمي للخدمات والحلول المتكاملة",
            heroDesc: "نقدم أرقى الخدمات بلمسة ذهبية ملكية تلبي تطلعاتكم وتواكب أرقى المعايير في المملكة.",
            bgUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1200",
            footerText: "جميع الحقوق محفوظة © مؤسسة البقمي للخدمات المتكاملة 2026"
        };
        await firebaseSet('settings', defaultSettings);
        return res.json(defaultSettings);
    }
    // إذا كانت مصفوفة بسبب دالة التحويل، نأخذ أول عنصر أو نرجع الكائن الأصلي
    const rawResponse = await fetch(`${FIREBASE_URL}settings.json`);
    const cleanObject = await rawResponse.json();
    res.json(cleanObject);
});

app.post('/api/site-settings/update', async (req, res) => {
    await firebaseSet('settings', req.body);
    res.json({ success: true });
});

// ================= نظام الزيارات والطلبات الواردة =================
app.get('/api/visits', async (req, res) => {
    try {
        const response = await fetch(`${FIREBASE_URL}visits.json`);
        let count = await response.json();
        res.json({ count: count || 0 });
    } catch { res.json({ count: 0 }); }
});

app.post('/api/visits/increment', async (req, res) => {
    try {
        const response = await fetch(`${FIREBASE_URL}visits.json`);
        let count = await response.json();
        count = (count === null) ? 1 : count + 1;
        await fetch(`${FIREBASE_URL}visits.json`, { method: 'PUT', body: JSON.stringify(count) });
        res.json({ success: true });
    } catch { res.json({ success: false }); }
});

app.get('/api/bookings', async (req, res) => {
    const bookings = await firebaseFetch('bookings');
    res.json(bookings || []);
});

app.post('/api/bookings', async (req, res) => {
    const newBooking = {
        bookingId: "BQ-" + Math.floor(10000 + Math.random() * 90000),
        clientName: req.body.clientName,
        clientPhone: req.body.clientPhone,
        serviceType: req.body.serviceType,
        details: req.body.details,
        status: "قيد المراجعة",
        adminPrice: "لم يحدد بعد",
        adminDuration: "تحت الدراسة",
        adminNotes: "جاري مراجعة طلبك وتحديد التكلفة من قبل الإدارة.",
        date: new Date().toLocaleDateString('ar-SA')
    };
    await firebaseSave('bookings', newBooking);
    res.status(201).json({ success: true, bookingId: newBooking.bookingId });
});

app.patch('/api/bookings/:id', async (req, res) => {
    await firebaseUpdate('bookings', req.params.id, req.body);
    res.json({ success: true });
});

app.delete('/api/bookings/:id', async (req, res) => {
    await firebaseDelete('bookings', req.params.id);
    res.json({ success: true });
});

// توجيهات المسارات الثابتة
app.get('/dashboard-gate', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server is perfectly deployed on port ${PORT}`));
