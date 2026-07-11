let currentSearchPhone = "";

window.onload = function() {
    fetch('/api/visits/increment', { method: 'POST' });
    loadSiteDynamicContent();
    
    // ⏳ تحديث حي كل 5 ثوانٍ للبيانات
    setInterval(() => {
        loadSiteDynamicContent();
        if (currentSearchPhone) {
            silentCheckMyOffers();
        }
    }, 5000);
};

async function loadSiteDynamicContent() {
    try {
        const res = await fetch('/api/site-settings');
        const data = await res.json();
        if (data) {
            document.title = data.logoText + " | للخدمات والحلول المتكاملة";
            document.getElementById('siteLogoText').innerText = data.logoText;
            document.getElementById('heroTitle').innerText = data.heroTitle;
            document.getElementById('heroDesc').innerText = data.heroDesc;
            document.getElementById('siteFooter').innerText = data.footerText;
            document.getElementById('heroBg').style.background = `linear-gradient(rgba(11, 15, 23, 0.75), rgba(11, 15, 23, 0.95)), url('${data.bgUrl}') no-repeat center center/cover`;
            
            // التحكم بظهور وصورة اللوجو
            const logoImg = document.getElementById('siteLogoImg');
            if(data.logoImgUrl && data.logoImgUrl.trim() !== "") {
                logoImg.src = data.logoImgUrl;
                logoImg.style.display = "block";
            } else {
                logoImg.style.display = "none";
            }
        }
    } catch (e) { console.log(e); }
}

async function sendClientRequest() {
    const data = {
        clientName: document.getElementById('cName').value.trim(),
        clientPhone: document.getElementById('cPhone').value.trim(),
        serviceType: document.getElementById('cType').value,
        details: document.getElementById('cDetails').value.trim()
    };

    const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    if(result.success) {
        alert(`تم استلام طلبك بنجاح لمؤسسة البقمي!\nرقم معاملتك: ${result.bookingId}`);
        currentSearchPhone = data.clientPhone;
        document.getElementById('searchPhone').value = currentSearchPhone;
        document.getElementById('newRequestForm').reset();
        checkMyOffers();
    }
}

async function checkMyOffers() {
    const phone = document.getElementById('searchPhone').value.trim();
    if(!phone) { alert('الرجاء إدخال رقم الجوال أولاً.'); return; }
    currentSearchPhone = phone;
    document.getElementById('statusResultOutput').innerHTML = '<p style="color:var(--text-muted); text-align:center;">جاري استدعاء عروض الفايربيز الحية...</p>';
    silentCheckMyOffers();
}

async function silentCheckMyOffers() {
    if (!currentSearchPhone) return;
    const output = document.getElementById('statusResultOutput');
    
    try {
        const res = await fetch('/api/bookings');
        const bookings = await res.json();
        const myJobs = bookings.filter(b => b.clientPhone.trim() === currentSearchPhone);
        
        if(myJobs.length === 0) {
            output.innerHTML = '<div style="color:var(--white); text-align:center; padding:15px; background:rgba(239,68,68,0.15); border-radius:4px; font-weight:bold;">لم نجد طلباً مسجلاً بهذا الرقم حالياً.</div>';
            return;
        }
        
        output.innerHTML = '';
        myJobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'result-item';
            let badgeClass = 'status-waiting';
            if (job.status === "تم قبول الطلب") badgeClass = 'status-accepted';
            if (job.status === "تم رفض الطلب") badgeClass = 'status-rejected';

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span style="color:var(--text-muted); font-size:0.85rem;">المعاملة: <code>${job.bookingId}</code></span>
                    <span class="status-badge ${badgeClass}">${job.status}</span>
                </div>
                <p style="font-size:1rem; margin-bottom:12px; color:var(--white);"><b>طلبك:</b> ${job.details}</p>
                <div style="background:rgba(212,175,55,0.06); padding:15px; border-radius:4px;">
                    <div style="color:var(--royal-gold); font-weight:900; font-size:1.15rem; margin-bottom:5px;">💰 السعر: <span style="color:#FFF;">${job.adminPrice}</span></div>
                    <div style="color:var(--success); font-weight:900; font-size:1rem; margin-bottom:5px;">⏱️ المدة المتوقعة: <span style="color:#FFF;">${job.adminDuration}</span></div>
                    <div style="font-size:0.9rem; color:#FFF; margin-bottom:8px;"><b>📋 الأوراق المطلوبة:</b> <span style="color:var(--gold-light);">${job.requiredPapers}</span></div>
                    <div style="font-size:0.85rem; color:var(--text-muted); border-top:1px dashed rgba(212,175,55,0.2); padding-top:8px;"><b>توجيه الإدارة:</b> <span style="color:#EEE;">${job.adminNotes}</span></div>
                </div>
            `;
            output.appendChild(div);
        });
    } catch(e) { console.log(e); }
}
