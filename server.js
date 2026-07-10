const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// مسارات الملفات للتخزين الثابت
const SERVICES_FILE = path.join(__dirname, 'services.json');
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// دالات مساعدة للقراءة والكتابة من ملفات التخزين
const readData = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
};

const writeData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// إتاحة الملفات العامة للعميل والأدمن بشكل منفصل
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel')));

// ================= API للخدمات =================
app.get('/api/services', (req, res) => {
    res.json(readData(SERVICES_FILE));
});

app.post('/api/services', (req, res) => {
    const services = readData(SERVICES_FILE);
    const newService = {
        id: "srv_" + Date.now(),
        name: req.body.name,
        price: req.body.price,
        time: req.body.time,
        description: req.body.description,
        customFields: req.body.customFields || []
    };
    services.unshift(newService);
    writeData(SERVICES_FILE, services);
    res.status(201).json(newService);
});

app.delete('/api/services/:id', (req, res) => {
    let services = readData(SERVICES_FILE);
    services = services.filter(s => s.id !== req.params.id);
    writeData(SERVICES_FILE, services);
    res.json({ success: true });
});

// ================= API للحجوزات =================
app.get('/api/bookings', (req, res) => {
    res.json(readData(BOOKINGS_FILE));
});

app.post('/api/bookings', (req, res) => {
    const bookings = readData(BOOKINGS_FILE);
    const newBooking = {
        id: "BQ-" + Math.floor(1000 + Math.random() * 9000),
        clientName: req.body.clientName,
        clientPhone: req.body.clientPhone,
        serviceName: req.body.serviceName,
        customData: req.body.customData || []
    };
    bookings.unshift(newBooking);
    writeData(BOOKINGS_FILE, bookings);
    res.status(201).json(newBooking);
});

app.delete('/api/bookings/:id', (req, res) => {
    let bookings = readData(BOOKINGS_FILE);
    bookings = bookings.filter(b => b.id !== req.params.id);
    writeData(BOOKINGS_FILE, bookings);
    res.json({ success: true });
});

// ================= توجيه الصفحات المنفصلة =================
// رابط صفحة الأدمن المنعزل تماماً
app.get('/dashboard-gate', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'admin.html'));
});

// رابط الصفحة الرئيسية للعملاء
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running fully on port ${PORT}`);
});
