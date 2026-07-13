import { db, ref, get, child, showToast } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (orderId) {
        document.getElementById("input-search-invoice").value = orderId;
        fetchInvoiceData(orderId);
    } else {
        document.getElementById("loading-screen").style.display = "none";
    }

    const btnFetch = document.getElementById("btn-fetch-invoice");
    if (btnFetch) {
        btnFetch.addEventListener("click", () => {
            const id = document.getElementById("input-search-invoice").value.trim();
            if (id) {
                fetchInvoiceData(id);
            } else {
                showToast("الرجاء إدخال رقم الطلب للبحث عن الفاتورة", "error");
            }
        });
    }
});

function fetchInvoiceData(orderId) {
    const loader = document.getElementById("loading-screen");
    if (loader) loader.style.display = "flex";

    get(child(ref(db), `invoices/${orderId}`)).then((snapshot) => {
        if (loader) loader.style.display = "none";

        if (snapshot.exists()) {
            const invoice = snapshot.val();
            renderInvoice(invoice);
        } else {
            showToast("لم يتم العثور على فاتورة لهذا الطلب. تأكد من الرقم وصلاحيته.", "error");
        }
    }).catch((err) => {
        if (loader) loader.style.display = "none";
        showToast("حدث خطأ أثناء البحث عن الفاتورة.", "error");
    });
}

function renderInvoice(invoice) {
    document.getElementById("lbl-invoice-id").textContent = invoice.invoiceId || `INV-${invoice.orderId}`;
    
    // Formatting date neatly
    const dateObj = new Date(invoice.date);
    document.getElementById("lbl-invoice-date").textContent = `التاريخ: ${dateObj.toLocaleDateString('ar-EG')}`;
    
    document.getElementById("lbl-cust-name").textContent = invoice.customerName;
    document.getElementById("lbl-cust-phone").textContent = `جوال: ${invoice.customerPhone || 'متاح بطلب الشراء'}`;
    document.getElementById("lbl-cust-address").textContent = `المدينة: ${invoice.city || 'الرياض'} - العنوان: ${invoice.address || 'توصيل للموقع'}`;
    
    const statusLbl = document.getElementById("lbl-invoice-status");
    statusLbl.textContent = invoice.status || "بانتظار الدفع";
    if (invoice.status === "مدفوعة") {
        statusLbl.style.backgroundColor = "#2ecc71";
    } else {
        statusLbl.style.backgroundColor = "#e67e22";
    }

    // Load Products into the table rows
    const tbody = document.getElementById("invoice-items-body");
    tbody.innerHTML = "";
    
    let subtotal = 0;
    const products = invoice.products || [];

    products.forEach(p => {
        const rowTotal = parseFloat(p.price) * parseInt(p.quantity);
        subtotal += rowTotal;

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--glass-border)";
        tr.innerHTML = `
            <td style="padding: 15px 12px; color: #fff;">${p.name}</td>
            <td style="padding: 15px 12px; text-align: center; color: #fff;">${p.quantity}</td>
            <td style="padding: 15px 12px; text-align: center; color: #fff;">${parseFloat(p.price).toFixed(2)} ر.س</td>
            <td style="padding: 15px 12px; text-align: left; color: #fff;">${rowTotal.toFixed(2)} ر.س</td>
        `;
        tbody.appendChild(tr);
    });

    // Tax calculation (15% Saudi VAT)
    const taxValue = subtotal * 0.15;
    const grandTotal = subtotal + taxValue;

    document.getElementById("invoice-subtotal").textContent = `${subtotal.toFixed(2)} ر.س`;
    document.getElementById("invoice-tax").textContent = `${taxValue.toFixed(2)} ر.س`;
    document.getElementById("invoice-grand-total").textContent = `${grandTotal.toFixed(2)} ر.س`;

    // Generate ZATCA-compliant mock QR Code
    const qrContainer = document.getElementById("invoice-qrcode");
    qrContainer.innerHTML = ""; // Clear old QR Code if exists
    
    // ZATCA dynamic string format: Seller Name | Tax Number | Timestamp | Grand Total | Tax Amount
    const qrText = `Al-Buqami Smart Solutions | VAT: 310XXXXXXXXXXXX | Time: ${invoice.date} | Total: ${grandTotal.toFixed(2)} SAR | VAT: ${taxValue.toFixed(2)} SAR`;
    
    new QRCode(qrContainer, {
        text: qrText,
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}
