// ==========================================
// 1. المتغيرات والأكواد الأصلية لمنصة البقمي
// ==========================================
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

    // تهيئة ميزات الفاتورة إذا كانت العناصر موجودة بالصفحة الحالية
    initInvoiceFeatures();
};

async function loadSiteDynamicContent() {
    try {
        const res = await fetch('/api/site-settings');
        const data = await res.json();
        if (data) {
            document.title = data.logoText + " | للخدمات والحلول المتكاملة";
            const logoTextEl = document.getElementById('siteLogoText');
            if(logoTextEl) logoTextEl.innerText = data.logoText;
            
            const heroTitleEl = document.getElementById('heroTitle');
            if(heroTitleEl) heroTitleEl.innerText = data.heroTitle;
            
            const heroDescEl = document.getElementById('heroDesc');
            if(heroDescEl) heroDescEl.innerText = data.heroDesc;
            
            const siteFooterEl = document.getElementById('siteFooter');
            if(siteFooterEl) siteFooterEl.innerText = data.footerText;
            
            const heroBgEl = document.getElementById('heroBg');
            if(heroBgEl) {
                heroBgEl.style.background = `linear-gradient(rgba(11, 15, 23, 0.75), rgba(11, 15, 23, 0.95)), url('${data.bgUrl}') no-repeat center center/cover`;
            }
            
            // التحكم بظهور وصورة اللوجو
            const logoImg = document.getElementById('siteLogoImg');
            if(logoImg) {
                if(data.logoImgUrl && data.logoImgUrl.trim() !== "") {
                    logoImg.src = data.logoImgUrl;
                    logoImg.style.display = "block";
                } else {
                    logoImg.style.display = "none";
                }
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
    if(!output) return;
    
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


// ==========================================
// 2. الكود الجديد المدمج لإدارة وإصدار الفواتير والـ PDF
// ==========================================
function initInvoiceFeatures() {
    const itemsContainer = document.getElementById('items-container');
    const addItemBtn = document.getElementById('add-item-btn');
    const generateBtn = document.getElementById('generate-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    // إذا لم نكن في صفحة الفواتير، نخرج فوراً لتجنب الأخطاء البرمجية
    if (!generateBtn) return;

    // ➕ إضافة صفوف عناصر جديدة ديناميكيًا عند الضغط
    if (addItemBtn && itemsContainer) {
        addItemBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <input type="text" class="item-desc" placeholder="وصف الخدمة / المنتج" required>
                <input type="number" class="item-qty" placeholder="الكمية" min="1" value="1" required>
                <input type="number" class="item-price" placeholder="السعر" min="0" step="0.01" required>
            `;
            itemsContainer.appendChild(row);
        });
    }

    // 🔄 دالة احتساب الفاتورة بدقة وتحديث جدول المعاينة بالضريبة والإجمالي
    function updateInvoicePreview() {
        const clientName = document.getElementById('client-name').value || 'عميل محترم';
        const invoiceDate = document.getElementById('invoice-date').value || new Date().toLocaleDateString('ar-EG');
        const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;

        // تحديث النصوص في الهيكل الجاهز للـ PDF
        if(document.getElementById('pdf-client-name')) document.getElementById('pdf-client-name').textContent = clientName;
        if(document.getElementById('pdf-invoice-date')) document.getElementById('pdf-invoice-date').textContent = invoiceDate;
        if(document.getElementById('pdf-tax-percentage')) document.getElementById('pdf-tax-percentage').textContent = taxRate;

        const itemRows = document.querySelectorAll('.item-row');
        const pdfItemsBody = document.getElementById('pdf-items-body');
        if (!pdfItemsBody) return;
        
        pdfItemsBody.innerHTML = ''; // تصفير الجدول لإعادة البناء الحية

        let subtotal = 0;

        itemRows.forEach(row => {
            const descInput = row.querySelector('.item-desc');
            const qtyInput = row.querySelector('.item-qty');
            const priceInput = row.querySelector('.item-price');

            if (descInput && qtyInput && priceInput) {
                const desc = descInput.value;
                const qty = parseFloat(qtyInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;

                if (desc) {
                    const rowTotal = qty * price;
                    subtotal += rowTotal;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${desc}</td>
                        <td class="text-center">${qty}</td>
                        <td class="text-center">${price.toFixed(2)} ج.م</td>
                        <td class="text-left">${rowTotal.toFixed(2)} ج.م</td>
                    `;
                    pdfItemsBody.appendChild(tr);
                }
            }
        });

        if (pdfItemsBody.children.length === 0) {
            pdfItemsBody.innerHTML = `<tr><td colspan="4" class="text-center empty-msg">قم بتعبئة البيانات واضغط على إصدار لتحديث الفاتورة</td></tr>`;
        }

        // الحسابات الرياضية الدقيقة للضريبة والمبلغ الإجمالي الكلي مثل الجدول
        const taxAmount = subtotal * (taxRate / 100);
        const finalTotal = subtotal + taxAmount;

        // تحديث المبالغ المالية داخل نموذج الفاتورة
        if(document.getElementById('pdf-subtotal')) document.getElementById('pdf-subtotal').textContent = `${subtotal.toFixed(2)} ج.م`;
        if(document.getElementById('pdf-tax-amount')) document.getElementById('pdf-tax-amount').textContent = `${taxAmount.toFixed(2)} ج.م`;
        if(document.getElementById('pdf-total-price')) document.getElementById('pdf-total-price').textContent = `${finalTotal.toFixed(2)} ج.م`;
    }

    // ربط زر الإصدار وتحديث المعاينة
    generateBtn.addEventListener('click', updateInvoicePreview);

    // 📥 تشغيل محرك التحميل وحفظ الفاتورة كملف PDF
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            // التحديث التلقائي للبيانات لضمان عدم وجود نقص
            updateInvoicePreview();

            const invoiceElement = document.getElementById('invoice-template');
            const clientName = document.getElementById('client-name').value || 'فاتورة';

            if (!invoiceElement) {
                alert('خطأ: لم يتم العثور على قالب الفاتورة المخصصة للطباعة.');
                return;
            }

            // إعدادات جودة توليد الـ PDF ليدعم اللغة العربية والاتجاه من اليمين لليسار RTL
            const opt = {
                margin:       10,
                filename:     `FARESPCB_Invoice_${clientName}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // تشغيل مكتبة html2pdf للتحميل الفوري المتوافق مع Vercel
            html2pdf().set(opt).from(invoiceElement).save().catch(err => {
                console.error('خطأ أثناء تحميل ملف الـ PDF:', err);
                alert('حدثت مشكلة أثناء محاولة إنشاء وتحميل ملف الـ PDF الكلي.');
            });
        });
    }
}
