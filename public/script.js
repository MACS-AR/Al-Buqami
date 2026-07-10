window.onload = function() {
    fetch('/api/visits/increment', { method: 'POST' });
};

async function sendClientRequest() {
    const data = {
        clientName: document.getElementById('cName').value,
        clientPhone: document.getElementById('cPhone').value,
        serviceType: document.getElementById('cType').value,
        details: document.getElementById('cDetails').value
    };

    const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    if(result.success) {
        alert(`تم استلام طلبك بنجاح لمؤسسة البقمي!\nرقم معاملتك السري هو: ${result.bookingId}\nيرجى الاحتفاظ به ومتابعة عرض السعر برقم جوالك.`);
        document.getElementById('newRequestForm').reset();
    }
}

async function checkMyOffers() {
    const phone = document.getElementById('searchPhone').value.trim();
    const output = document.getElementById('statusResultOutput');
    if(!phone) { alert('الرجاء إدخال رقم الجوال أولاً.'); return; }
    
    output.innerHTML = '<p style="color:var(--text-muted); text-align:center;">جاري جلب عروض السعر الفورية...</p>';
    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    
    // فلترة المعاملات المطابقة لرقم الهاتف
    const myJobs = bookings.filter(b => b.clientPhone.trim() === phone);
    
    if(myJobs.length === 0) {
        output.innerHTML = '<div style="color:var(--white); text-align:center; padding:10px; background:rgba(239,68,68,0.15); border-radius:4px;">لم نجد أي طلبات مسجلة بهذا الرقم حالياً.</div>';
        return;
    }
    
    output.innerHTML = '';
    myJobs.forEach(job => {
        const div = document.createElement('div');
        div.className = 'result-item';
        const isDone = job.status === "تم تقديم العرض";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="color:var(--text-muted); font-size:0.85rem;">رقم الطلب: <code>${job.bookingId}</code></span>
                <span class="status-badge ${isDone ? 'status-done' : 'status-waiting'}">${job.status}</span>
            </div>
            <p style="font-size:0.9rem; margin-bottom:10px;"><b>طلبك:</b> ${job.details}</p>
            <div style="background:rgba(212,175,55,0.06); padding:10px; border-radius:4px; margin-top:5px;">
                <div style="color:var(--royal-gold); font-weight:bold; font-size:1.05rem;">💰 التكلفة المقدرة: <span style="color:#FFF;">${job.adminPrice}</span></div>
                <div style="color:var(--success); font-weight:bold; font-size:0.95rem; margin:5px 0;">⏱️ مدة العمل: <span style="color:#FFF;">${job.adminDuration}</span></div>
                <div style="font-size:0.85rem; color:var(--text-muted);"><b>ملاحظة الإدارة:</b> ${job.adminNotes}</div>
            </div>
        `;
        output.appendChild(div);
    });
}
