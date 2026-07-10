async function loadSiteDynamicContent() {
    // زيادة العداد
    fetch('/api/visits/increment', { method: 'POST' });

    // سحب المحتوى من الفايربيز لبثه لايف للعملاء
    try {
        const res = await fetch('/api/site-settings');
        const data = await res.json();
        if (data) {
            document.getElementById('siteTitle').innerText = data.logoText + " | للخدمات المتكاملة";
            document.getElementById('siteLogo').innerText = data.logoText;
            document.getElementById('heroTitle').innerText = data.heroTitle;
            document.getElementById('heroDesc').innerText = data.heroDesc;
            document.getElementById('siteFooter').innerText = data.footerText;
            document.getElementById('heroBg').style.background = `linear-gradient(rgba(11, 15, 23, 0.75), rgba(11, 15, 23, 0.95)), url('${data.bgUrl}') no-repeat center center/cover`;
        }
    } catch (e) { console.log(e); }
}

async function submitClientRequest() {
    const data = {
        clientName: document.getElementById('clientName').value.trim(),
        clientPhone: document.getElementById('clientPhone').value.trim(),
        serviceType: document.getElementById('serviceType').value,
        details: document.getElementById('details').value.trim()
    };

    const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
        alert(`تم إرسال وقيد طلبك بنجاح بمؤسسة البقمي!\nرقم معاملتك المرجعي هو: ${result.bookingId}\nيرجى المتابعة برقم جوالك بانتظام.`);
        document.getElementById('bookingForm').reset();
    }
}

async function searchOffers() {
    const phone = document.getElementById('searchPhone').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    if (!phone) { alert('يرجى كتابة رقم الجوال.'); return; }

    resultsContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center;">جاري البحث بداخل غرفة العمليات في فايربيز...</p>';
    
    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    
    const matches = bookings.filter(b => b.clientPhone.trim() === phone);
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div style="color:var(--white); text-align:center; padding:15px; background:rgba(239,68,68,0.15); border-radius:4px; font-weight:bold;">لم نجد أي طلبات مرتبطة بهذا الرقم حالياً.</div>';
        return;
    }

    resultsContainer.innerHTML = '';
    matches.forEach(item => {
        const box = document.createElement('div');
        box.className = 'offer-box';
        const isAnswered = item.status === "تم تقديم العرض";
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="color:var(--text-muted); font-size:0.85rem;">رقم المعاملة: <code>${item.bookingId}</code></span>
                <span class="status-badge ${isAnswered ? 'status-done' : 'status-waiting'}">${item.status}</span>
            </div>
            <p style="font-size:0.95rem; margin-bottom:12px; color:var(--white);"><b>تفاصيل طلبك:</b> ${item.details}</p>
            <div style="background:rgba(212,175,55,0.06); padding:15px; border-radius:4px;">
                <div style="color:var(--royal-gold); font-weight:900; font-size:1.1rem; margin-bottom:5px;">💰 تكلفة الخدمة المقدرة: <span style="color:#FFF;">${item.adminPrice}</span></div>
                <div style="color:var(--success); font-weight:900; font-size:1rem; margin-bottom:8px;">⏱️ المدة الزمنية وأيام العمل: <span style="color:#FFF;">${item.adminDuration}</span></div>
                <div style="font-size:0.85rem; color:var(--text-muted); border-top:1px dashed rgba(212,175,55,0.2); padding-top:8px;"><b>توجيه الإدارة والتعليمات:</b> <span style="color:#EEE;">${item.adminNotes}</span></div>
            </div>
        `;
        resultsContainer.appendChild(box);
    });
}

window.onload = loadSiteDynamicContent;
