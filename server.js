const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔗 رابط قاعدة بيانات الفايربيز الخاصة بك
const FIREBASE_URL = "https://sr-test-c9e06-default-rtdb.firebaseio.com/";

// دالة جلب البيانات العامة وتحويلها لمصفوفة مع الـ ID الفريد
async function firebaseFetch(endpoint) {
    try {
        const response = await fetch(`${FIREBASE_URL}${endpoint}.json`);
        const data = await response.json();
        if (!data) return [];
        if (typeof data === 'object' && !Array.isArray(data)) {
            return Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        }
        return Array.isArray(data) ? data : [];
    } catch (error) { 
        return []; 
    }
}

// دوال التحكم بالفايربيز
async function firebaseSave(endpoint, data) {
    try {
        const res = await fetch(`${FIREBASE_URL}${endpoint}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch { return null; }
}

async function firebaseSet(endpoint, data) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return true;
    } catch { return false; }
}

async function firebaseUpdate(endpoint, id, data) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}/${id}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return true;
    } catch { return false; }
}

async function firebaseDelete(endpoint, id) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}/${id}.json`, { method: 'DELETE' });
        return true;
    } catch { return false; }
}

// المجلدات العامة والواجهات
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel')));

// ================= نظام إدارة المحتوى (CMS) =================
app.get('/api/site-settings', async (req, res) => {
    try {
        const rawResponse = await fetch(`${FIREBASE_URL}settings.json`);
        const cleanObject = await rawResponse.json();
        if (!cleanObject) {
            const defaultSettings = {
                logoText: "مؤسسة البقمي",
                logoImgUrl: "public/assets/logo.png", // هنا تضع مسار لوجو الـ GitHub الخاص بك لاحقاً
                heroTitle: "مؤسسة البقمي للخدمات والحلول المتكاملة",
                heroDesc: "نقدم أرقى الخدمات بلمسة ذهبية ملكية تلبي تطلعاتكم وتواكب أرقى المعايير في المملكة.",
                bgUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1200",
                footerText: "جميع الحقوق محفوظة © مؤسسة البقمي للخدمات المتكاملة 2026"
            };
            await firebaseSet('settings', defaultSettings);
            return res.json(defaultSettings);
        }
        res.json(cleanObject);
    } catch { res.json({}); }
});

app.post('/api/site-settings/update', async (req, res) => {
    const success = await firebaseSet('settings', req.body);
    res.json({ success: success });
});

// ================= نظام الزيارات والتحليلات =================
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

// ================= معالجة المعاملات والطلبات =================
app.get('/api/bookings', async (req, res) => {
    const bookings = await firebaseFetch('bookings');
    res.json(bookings);
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
        requiredPapers: "جاري مراجعة الطلب لتحديد الأوراق المطلوبة.",
        adminNotes: "جاري مراجعة طلبك وتحديد التكلفة الإجمالية من قبل الإدارة.",
        date: new Date().toLocaleDateString('ar-SA')
    };
    const result = await firebaseSave('bookings', newBooking);
    if(result) {
        res.status(201).json({ success: true, bookingId: newBooking.bookingId });
    } else {
        res.status(500).json({ success: false });
    }
});

app.patch('/api/bookings/:id', async (req, res) => {
    const success = await firebaseUpdate('bookings', req.params.id, req.body);
    res.json({ success: success });
});

app.delete('/api/bookings/:id', async (req, res) => {
    const success = await firebaseDelete('bookings', req.params.id);
    res.json({ success: success });
});

// مسارات الصفحات
app.get('/dashboard-gate', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running perfectly on port ${PORT}`));
