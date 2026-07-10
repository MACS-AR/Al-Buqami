async function loadAdminWorkspace() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;

    // جلب إعدادات الـ CMS
    try {
        const cmsRes = await fetch('/api/site-settings');
        const cmsData = await cmsRes.json();
        if(cmsData) {
            document.getElementById('cmsLogo').value = cmsData.logoText;
            document.getElementById('cmsBg').value = cmsData.bgUrl;
            document.getElementById('cmsTitle').value = cmsData.heroTitle;
            document.getElementById('cmsDesc').value = cmsData.heroDesc;
            document.getElementById('cmsFooter').value = cmsData.footerText;
        }
    } catch(e) { console.log(e); }

    // جلب الزيارات وإجمالي الطلبات
    const vRes = await fetch('/api/visits');
    const vData = await vRes.json();
    document.getElementById('visitsCounter').innerText = vData.count;

    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    document.getElementById('totalCounter').innerText = bookings.length;

    tbody.innerHTML = '';
    if(bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">لا توجد طلبات مخزنة حالياً في الفايربيز.</td></tr>';
        return;
    }

    // بناء الجدول وعرض خانات القبول والتسعير لكل طلب بشكل مستقل
    bookings.forEach(item => {
        let statusClass = 'status-pending';
        if(item.status === "تم قبول الطلب") statusClass = 'status-accepted';
        if(item.status === "تم رفض الطلب") statusClass = 'status-rejected';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${item.bookingId}</code><br><small style="color:var(--text-muted);">${item.date}</small></td>
            <td><b>${item.clientName}</b><br><span style="color:var(--royal-gold);">${item.clientPhone}</span></td>
            <td><small>${item.serviceType}</small></td>
            <td style="max-width:250px; white-space:normal; word-wrap:break-word;"><small>${item.details}</small></td>
            <td>
                <div class="action-box">
                    <label style="font-size:0.8rem; color:var(--gold-light);">تحديد حالة المعاملة:</label>
                    <select id="status_${item.id}" class="form-control" style="padding:4px; font-size:0.85rem;">
                        <option value="تم قبول الطلب" ${item.status === 'تم قبول الطلب' ? 'selected' : ''}>إقرار وقبول الطلب ✓</option>
                        <option value="تم رفض الطلب" ${item.status === 'تم رفض الطلب' ? 'selected' : ''}>اعتذار ورفض الطلب ✕</option>
                    </select>
                    <input type="text" id="price_${item.id}" class="form-control" style="padding:4px; font-size:0.85rem;" placeholder="التكلفة (مثال: 3500 ريال)">
                    <input type="text" id="days_${item.id}" class="form-control" style="padding:4px; font-size:0.85rem;" placeholder="الوقت (مثال: 5 أيام عمل)">
                    <input type="text" id="papers_${item.id}" class="form-control" style="padding:4px; font-size:0.85rem;" placeholder="الأوراق المطلوبة والتفاصيل">
                    <input type="text" id="notes_${item.id}" class="form-control" style="padding:4px; font-size:0.85rem;" placeholder="ملاحظات إضافية للعميل">
                    <button class="btn-accept" onclick="processOrder('${item.id}')">💾 اعتماد الرد وبثه للفايربيز</button>
                </div>
            </td>
            <td>
                <div style="font-size:0.85rem; line-height:1.5;">
                    <b>الحالة:</b> <span class="status-pill ${statusClass}">${item.status}</span><br>
                    <b>السعر:</b> ${item.adminPrice}<br>
                    <b>المدة:</b> ${item.adminDuration}<br>
                    <b>الأوراق:</b> <span style="color:var(--text-muted);">${item.requiredPapers || 'لا يوجد'}</span><br>
                    <b>ملاحظات:</b> <span style="color:var(--text-muted);">${item.adminNotes || 'لا يوجد'}</span>
                </div>
            </td>
            <td>
                <button class="btn-danger" onclick="deleteOrder('${item.id}')">مسح</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// دالة إرسال التحديث والقبول والتسعير والأوراق للفايربيز
async function processOrder(id) {
    const status = document.getElementById(`status_${id}`).value;
    const price = document.getElementById(`price_${id}`).value.trim() || "لم يحدد";
    const days = document.getElementById(`days_${id}`).value.trim() || "تحت الدراسة";
    const papers = document.getElementById(`papers_${id}`).value.trim() || "لا يتطلب أوراق إضافية";
    const notes = document.getElementById(`notes_${id}`).value.trim() || "تمت مراجعة طلبك من قبل الإدارة.";

    const updateData = {
        status: status,
        adminPrice: price,
        adminDuration: days,
        requiredPapers: papers,
        adminNotes: notes
    };

    const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    });
    const result = await res.json();
    if(result.success) {
        alert('تم حفظ البيانات وتحديث حالة الطلب والتسعيرة بنجاح بالفايربيز!');
        loadAdminWorkspace();
    } else {
        alert('حدث خطأ أثناء التحديث، تأكد من اتصال الفايربيز.');
    }
}

async function updateCmsSettings() {
    const updatedData = {
        logoText: document.getElementById('cmsLogo').value.trim(),
        bgUrl: document.getElementById('cmsBg').value.trim(),
        heroTitle: document.getElementById('cmsTitle').value.trim(),
        heroDesc: document.getElementById('cmsDesc').value.trim(),
        footerText: document.getElementById('cmsFooter').value.trim()
    };

    const res = await fetch('/api/site-settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });
    const resData = await res.json();
    if(resData.success) {
        alert('تم تحديث نصوص وتصميم الموقع بنجاح!');
        loadAdminWorkspace();
    }
}

async function deleteOrder(id) {
    if(confirm('هل تريد حذف هذا الطلب نهائياً من قاعدة البيانات؟')) {
        await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
        loadAdminWorkspace();
    }
}

window.onload = loadAdminWorkspace;
