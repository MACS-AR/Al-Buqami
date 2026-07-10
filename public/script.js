// استبدل دالة searchOffers داخل ملف public/script.js بهذا الجزء ليظهر للعميل رد الأدمن الجديد:
async function searchOffers() {
    const phone = document.getElementById('searchPhone').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    if (!phone) { alert('يرجى كتابة رقم الجوال.'); return; }

    resultsContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center;">جاري فحص حالة المعاملة بالفايربيز...</p>';
    
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
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="color:var(--text-muted); font-size:0.85rem;">رقم المعاملة: <code>${item.bookingId}</code></span>
                <span style="background:rgba(212,175,55,0.15); color:var(--royal-gold); padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:bold;">${item.status}</span>
            </div>
            <p style="font-size:0.95rem; margin-bottom:12px; color:var(--white);"><b>تفاصيل طلبك:</b> ${item.details}</p>
            <div style="background:rgba(212,175,55,0.06); padding:15px; border-radius:4px;">
                <div style="color:var(--royal-gold); font-weight:900; font-size:1.1rem; margin-bottom:5px;">💰 التكلفة المقدرة: <span style="color:#FFF;">${item.adminPrice}</span></div>
                <div style="color:var(--success); font-weight:900; font-size:1rem; margin-bottom:8px;">⏱️ المدة الزمنية وأيام العمل: <span style="color:#FFF;">${item.adminDuration}</span></div>
                <div style="font-size:0.9rem; color:#EEE; margin-bottom:5px;"><b>📋 الأوراق والملفات المطلوبة:</b> ${item.requiredPapers || 'لا يوجد'}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); border-top:1px dashed rgba(212,175,55,0.2); padding-top:8px;"><b>توجيه الإدارة والتعليمات:</b> <span style="color:#EEE;">${item.adminNotes}</span></div>
            </div>
        `;
        resultsContainer.appendChild(box);
    });
}
