async function loadAdminWorkspace() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    
    // 1. جلب إعدادات محتوى الموقع وملئها بالـ Inputs لكي يعدلها الأدمن بأي وقت
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
    } catch(e) { console.log("CMS load error", e); }

    // 2. جلب إحصائيات الزوار والطلبات
    const vRes = await fetch('/api/visits');
    const vData = await vRes.json();
    document.getElementById('visitsCounter').innerText = vData.count;

    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    
    document.getElementById('totalCounter').innerText = bookings.length;
    const pending = bookings.filter(b => b.status === "قيد المراجعة");
    document.getElementById('pendingCounter').innerText = pending.length + " طلب";

    tbody.innerHTML = '';
    if(bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">لا يوجد أي طلبات واردة في السجل حالياً.</td></tr>';
        return;
    }

    // 3. بناء جدول الطلبات لتسعيرها
    bookings.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${item.bookingId}</code><br><small style="color:var(--text-muted);">${item.date}</small></td>
            <td><b>${item.clientName}</b><br><a href="tel:${item.clientPhone}" style="color:var(--royal-gold); text-decoration:none; font-weight:bold;">${item.clientPhone}</a></td>
            <td><span style="color:var(--gold-light); font-weight:bold;">${item.serviceType}</span></td>
            <td style="max-width:320px; white-space:normal; word-wrap:break-word;"><small>${item.details}</small></td>
            <td>
                <div class="pricing-deck">
                    <input type="text" id="p_${item.id}" class="form-control" style="padding:6px; font-size:0.85rem;" placeholder="مثال: 2000 ريال سعودي">
                    <input type="text" id="d_${item.id}" class="form-control" style="padding:6px; font-size:0.85rem;" placeholder="مثال: 3 أيام عمل">
                    <input type="text" id="n_${item.id}" class="form-control" style="padding:6px; font-size:0.85rem;" placeholder="ملاحظات أو شروط الشحن">
                    <button class="btn-update" onclick="publishPriceProposal('${item.id}')">إرسال عرض السعر للعميل ✓</button>
                </div>
            </td>
            <td>
                <div style="font-size:0.85rem; line-height:1.4;">
                    <b>الحالة:</b> <span style="color:var(--royal-gold);">${item.status}</span><br>
                    <b>السعر:</b> ${item.adminPrice}<br>
                    <b>المدة:</b> ${item.adminDuration}
                </div>
            </td>
            <td>
                <button class="btn-danger" onclick="removeRequest('${item.id}')">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
        alert('تم تعديل وحفظ نصوص وتصميم ومظهر الموقع بنجاح على الفايربيز وتحديثه للعملاء لايف!');
        loadAdminWorkspace();
    }
}

async function publishPriceProposal(id) {
    const price = document.getElementById(`p_${id}`).value.trim();
    const duration = document.getElementById(`d_${id}`).value.trim();
    const notes = document.getElementById(`n_${id}`).value.trim() || "تمت دراسة الطلب وإصدار الفاتورة المقدرة.";

    if(!price || !duration) {
        alert('يرجى كتابة عرض السعر والمدة الزمنية للعميل أولاً.');
        return;
    }

    const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: "تم تقديم العرض",
            adminPrice: price,
            adminDuration: duration,
            adminNotes: notes
        })
    });
    const result = await res.json();
    if(result.success) {
        alert('تم اعتماد وبث عرض السعر والرد على جوال العميل بنجاح تام!');
        loadAdminWorkspace();
    }
}

async function removeRequest(id) {
    if(confirm('هل تود مسح سجل معاملة هذا العميل من الفايربيز؟')) {
        await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
        loadAdminWorkspace();
    }
}

window.onload = loadAdminWorkspace;
