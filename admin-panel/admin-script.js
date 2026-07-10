const adminApiEngine = {
    getServices: async () => {
        const res = await fetch('/api/services');
        return await res.json();
    },
    addService: async (data) => {
        await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    deleteService: async (id) => {
        await fetch(`/api/services/${id}`, { method: 'DELETE' });
    },
    getBookings: async () => {
        const res = await fetch('/api/bookings');
        return await res.json();
    },
    deleteBooking: async (id) => {
        await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    }
};

let bufferedFields = [];

window.addFieldToCurrentBuffer = function() {
    const nameInput = document.getElementById('customFieldName');
    const typeSelect = document.getElementById('customFieldType');
    if(!nameInput || !nameInput.value.trim()) return;
    
    bufferedFields.push({ name: nameInput.value.trim(), type: typeSelect.value });
    nameInput.value = '';
    renderBufferedFields();
};

window.removeBufferedField = function(idx) {
    bufferedFields.splice(idx, 1);
    renderBufferedFields();
};

function renderBufferedFields() {
    const container = document.getElementById('bufferedFieldsContainer');
    if(!container) return;
    container.innerHTML = '';
    bufferedFields.forEach((f, idx) => {
        const d = document.createElement('div');
        d.className = 'builder-row';
        d.innerHTML = `<span>📍 ${f.name} (${f.type})</span><button type="button" class="btn-danger-sm" onclick="removeBufferedField(${idx})">إزالة</button>`;
        container.appendChild(d);
    });
}

window.saveNewServiceFromAdmin = function() {
    const name = document.getElementById('adminSrvName').value;
    const price = document.getElementById('adminSrvPrice').value;
    const time = document.getElementById('adminSrvTime').value;
    const desc = document.getElementById('adminSrvDesc').value;

    adminApiEngine.addService({ name, price, time, description: desc, customFields: bufferedFields })
    .then(() => {
        alert('تم حفظ ونشر الخدمة الجديدة وتحديث ملفات التخزين بنجاح!');
        document.getElementById('adminServiceForm').reset();
        bufferedFields = [];
        renderBufferedFields();
        refreshTables();
    });
};

window.deleteSrv = function(id) {
    if(confirm('هل أنت متأكد من حذف هذه الخدمة نهائياً من السيرفر؟')) {
        adminApiEngine.deleteService(id).then(() => refreshTables());
    }
};

window.deleteBooking = function(id) {
    if(confirm('هل تريد مسح معاملة هذا الحجز؟')) {
        adminApiEngine.deleteBooking(id).then(() => refreshTables());
    }
};

async function refreshTables() {
    const srvTbody = document.getElementById('adminServicesTableBody');
    const bTbody = document.getElementById('adminBookingsTableBody');
    if(!srvTbody || !bTbody) return;

    srvTbody.innerHTML = '';
    bTbody.innerHTML = '';

    const services = await adminApiEngine.getServices();
    services.forEach(s => {
        const tr = document.createElement('tr');
        const fieldsStr = s.customFields && s.customFields.length > 0 ? s.customFields.map(f=>f.name).join('، ') : 'أساسي';
        tr.innerHTML = `<td><b>${s.name}</b></td><td>${s.price} ريال</td><td>${s.time}</td><td>${fieldsStr}</td><td><button class="btn-danger-sm" onclick="deleteSrv('${s.id}')">حذف</button></td>`;
        srvTbody.appendChild(tr);
    });

    const bookings = await adminApiEngine.getBookings();
    bookings.forEach(b => {
        const tr = document.createElement('tr');
        const customStr = b.customData && b.customData.length > 0 ? b.customData.map(d=>`<b>${d.fieldName}:</b> ${d.value}`).join(' | ') : 'بيانات أساسية';
        tr.innerHTML = `<td><code>${b.id}</code></td><td>${b.clientName}</td><td>${b.clientPhone}</td><td>${b.serviceName}</td><td>${customStr}</td><td><button class="btn-danger-sm" onclick="deleteBooking('${b.id}')">إزالة الطلب</button></td>`;
        bTbody.appendChild(tr);
    });
}

window.onload = refreshTables;
