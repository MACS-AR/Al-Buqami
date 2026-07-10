const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ⚠️ ضع رابط قاعدة بيانات Firebase الخاص بك هنا (تأكد من وجود / في النهاية)
const FIREBASE_URL = "https://sr-test-c9e06-default-rtdb.firebaseio.com/";

async function firebaseFetch(endpoint) {
    try {
        const response = await fetch(`${FIREBASE_URL}${endpoint}.json`);
        const data = await response.json();
        if (!data) return [];
        return Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
    } catch (error) { return []; }
}

async function firebaseSave(endpoint, data) {
    try {
        await fetch(`${FIREBASE_URL}${endpoint}.json`, {
            method: 'POST',
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

// إتاحة الملفات العامة
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel')));

// إحصائيات الزيارات
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

// الحجوزات والطلبات المفتوحة
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
        adminNotes: "جاري مراجعة طلبك وتحديد التكلفة الإجمالية من قبل الإدارة.",
        date: new Date().toLocaleDateString('ar-SA')
    };
    await firebaseSave('bookings', newBooking);
    res.status(201).json({ success: true, bookingId: newBooking.bookingId });
});

// تحديث طلب العميل من قبل الأدمن (إضافة السعر والموعد)
app.patch('/api/bookings/:id', async (req, res) => {
    const updateData = {
        status: "تم تقديم العرض",
        adminPrice: req.body.adminPrice,
        adminDuration: req.body.adminDuration,
        adminNotes: req.body.adminNotes
    };
    await firebaseUpdate('bookings', req.params.id, updateData);
    res.json({ success: true });
});

app.delete('/api/bookings/:id', async (req, res) => {
    await firebaseDelete('bookings', req.params.id);
    res.json({ success: true });
});

// روابط التوجيه
app.get('/dashboard-gate', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server connected.`));
