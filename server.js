const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔗 رابط قاعدة بيانات الفايربيز الخاص بك
const FIREBASE_URL = "https://sr-test-c9e06-default-rtdb.firebaseio.com/";

// دالة جلب البيانات مع تحويل الكائنات إلى مصفوفة تحتوي على الـ ID الفريد للتحكم
async function firebaseFetch(endpoint) {
    try {
        const response = await fetch(`${FIREBASE_URL}${endpoint}.json`);
        const data = await response.json();
        if (!data) return [];
        // تحويل كائن الفايربيز إلى مصفوفة وحقن المفتاح الفريد (ID) في كل طلب
        return Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
    } catch (error) { 
        return []; 
    }
}

// دالة حفظ طلب جديد
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

// دالة تحديث طلب معين (تعديل السعر، الحالة، الأوراق، الأيام) بناءً على الـ ID
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

// ================= نظام إدارة محتوى الموقع (CMS) =================
app.get('/api/site-settings', async (req, res) => {
    try {
        const rawResponse = await fetch(`${FIREBASE_URL}settings.json`);
        const cleanObject = await rawResponse.json();
        if (!cleanObject) {
            const defaultSettings = {
                logoText: "مؤسسة البقمي",
                heroTitle: "مؤسسة البقمي للخدمات والحلول المتكاملة",
                heroDesc: "نقدم أرقى الخدمات بلمسة ذهبية ملكية تلبي تطلعاتكم وتواكب أرقى المعايير في المملكة.",
                bgUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1200",
                footerText: "جميع الحقوق محفوظة © مؤسسة البقمي للخدمات المتكاملة 2026"
            };
            await fetch(`${FIREBASE_URL}settings.json`, { method: 'PUT', body: JSON.stringify(defaultSettings) });
            return res.json(defaultSettings);
        }
        res.json(cleanObject);
    } catch {
        res.json({});
    }
});

app.post('/api/site-settings/update', async (req, res) => {
    try {
        await fetch(`${FIREBASE_URL}settings.json`, { method: 'PUT', body: JSON.stringify(req.body) });
        res.json({ success: true });
    } catch { res.json({ success: false }); }
});

// ================= نظام الزيارات والطلبات =================
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

// جلب الطلبات (ستظهر الآن للأدمن لأن الـ ID مدمج ومضمون)
app.get('/api/bookings', async (req, res) => {
    const bookings = await firebaseFetch('bookings');
    res.json(bookings);
});

// استقبال وتخزين الطلب الجديد من العميل
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
        adminNotes: "طلبك قيد الدراسة حالياً وسيتم الرد عليك بالتسعيرة قريباً.",
        date: new Date().toLocaleDateString('ar-SA')
    };
    const result = await firebaseSave('bookings', newBooking);
    if (result) {
        res.status(201).json({ success: true, bookingId: newBooking.bookingId });
    } else {
        res.status(500).json({ success: false });
    }
});

// تحديث الطلب من صفحة الأدمن (قبول/رفض + سعر + أيام عمل + أوراق)
app.patch('/api/bookings/:id', async (req, res) => {
    const success = await firebaseUpdate('bookings', req.params.id, req.body);
    res.json({ success: success });
});

app.delete('/api/bookings/:id', async (req, res) => {
    const success = await firebaseDelete('bookings', req.params.id);
    res.json({ success: success });
});

app.get('/dashboard-gate', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server is running perfectly on port ${PORT}`));
