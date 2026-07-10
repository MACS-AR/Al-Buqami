async function refreshAdminDashboard() {
    const tbody = document.getElementById('adminRequestsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    // جلب عداد الزيارات والطلبات
    const vRes = await fetch('/api/visits');
    const vData = await vRes.json();
    document.getElementById('vCounter').innerText = vData.count;

    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    
    document.getElementById('totalCounter').innerText = bookings.length;
    const pendingJobs = bookings.filter(b => b.status === "قيد المراجعة");
    document.getElementById('pendingCounter').innerText = pendingJobs.length + " طلب";

    if(bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">لا يوجد أي طلبات واردة حالياً في قاعدة البيانات.</td></tr>';
        return;
    }

    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${b.bookingId}</code><br><small style="color:var(--text-muted);">${b.date}</small></td>
            <td><b>${b.clientName}</b><br><a href="tel:${b.clientPhone}" style="color:var(--royal-gold); text-decoration:none;">${b.clientPhone}</a></td>
            <td><span style="color:var(--gold-light);">${b.serviceType}</span></td>
            <td style="max-width:300px; white-space: normal; word-wrap: break-word;"><small>${b.details}</small></td>
            <td>
                <div class="pricing-inputs-container">
                    <input type="text" id="price_${b.id}" class="input-sm" placeholder="مثال: 1500 ريال سعودي">
                    <input type="text" id="duration_${b.id}" class="input-sm" placeholder="مثال: 4 أيام عمل">
                    <input type="text" id="notes_${b.id}" class="input-sm" placeholder="ملاحظات إضافية أو شروط">
                    <button class="btn-update" onclick="submitPricingProposal('${b.id}')">إرسال عرض السعر لـلعميل ✓</button>
                </div>
            </td>
            <td>
                <div style="font-size:0.85rem;">
                    <b>الحالة:</b> ${b.status}<br>
                    <b>السعر:</b> ${b.adminPrice}<br>
                    <b>الوقت:</b> ${b.adminDuration}
                </div>
            </td>
            <td>
                <button class="btn-danger-sm" onclick="deleteJob('${b.id}')">مسح السجل</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function submitPricingProposal(id) {
    const price = document.getElementById(`price_${id}`).value.trim();
    const duration = document.getElementById(`duration_${id}`).value.trim();
    const notes = document.getElementById(`notes_${id}`).value.trim() || "تمت دراسة طلبك بنجاح.";

    if(!price || !duration) {
        alert('يرجى تحديد السعر الإجمالي وعدد أيام العمل أولاً للعميل.');
        return;
    }

    const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPrice: price, adminDuration: duration, adminNotes: notes })
    });
    const result = await res.json();
    if(result.success) {
        alert('تم إرسال ونشر عرض السعر والمدة المقدرة للعميل بنجاح!');
        refreshAdminDashboard();
    }
}

async function deleteJob(id) {
    if(confirm('هل تود إزالة معاملة هذا العميل تماماً؟')) {
        await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
        refreshAdminDashboard();
    }
}

window.onload = refreshAdminDashboard;
