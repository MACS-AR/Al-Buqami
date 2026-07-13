import { db, ref, get, set, child, update, remove, showToast } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    loadDashboardData();

    // Toggle product form visibility
    const btnOpenAdd = document.getElementById("btn-open-add-product");
    const addWrapper = document.getElementById("add-product-wrapper");
    const btnCancel = document.getElementById("btn-cancel-product");

    if (btnOpenAdd && addWrapper) {
        btnOpenAdd.addEventListener("click", () => {
            addWrapper.style.display = "block";
            btnOpenAdd.style.display = "none";
        });
    }

    if (btnCancel && addWrapper && btnOpenAdd) {
        btnCancel.addEventListener("click", () => {
            addWrapper.style.display = "none";
            btnOpenAdd.style.display = "inline-flex";
            document.getElementById("add-product-form").reset();
        });
    }

    // Submit new product
    const productForm = document.getElementById("add-product-form");
    if (productForm) {
        productForm.addEventListener("submit", (e) => {
            e.preventDefault();
            addNewProduct();
        });
    }
});

// Admin Tab Navigation Switcher
function initTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Remove active style from all tabs
            tabs.forEach(t => {
                t.classList.remove("btn-gold");
                t.classList.add("btn-outline");
            });

            // Set current active
            tab.classList.remove("btn-outline");
            tab.classList.add("btn-gold");

            // Hide all sections
            document.querySelectorAll(".tab-content").forEach(sec => {
                sec.style.display = "none";
            });

            // Show selected section
            const targetId = tab.getAttribute("data-target");
            document.getElementById(targetId).style.display = "block";
        });
    });
}

// Global dashboard loader
function loadDashboardData() {
    document.getElementById("loading-screen").style.display = "flex";

    Promise.all([
        get(child(ref(db), "orders")),
        get(child(ref(db), "products")),
        get(child(ref(db), "rfqs"))
    ]).then(([ordersSnap, productsSnap, rfqsSnap]) => {
        document.getElementById("loading-screen").style.display = "none";

        const orders = ordersSnap.exists() ? ordersSnap.val() : {};
        const products = productsSnap.exists() ? productsSnap.val() : {};
        const rfqs = rfqsSnap.exists() ? rfqsSnap.val() : {};

        calculateStats(orders, products, rfqs);
        renderOrders(orders);
        renderProducts(products);
        renderRFQs(rfqs);

    }).catch(err => {
        document.getElementById("loading-screen").style.display = "none";
        showToast("فشل استدعاء البيانات من السيرفر.", "error");
    });
}

// Calculate Dashboard Key metrics
function calculateStats(orders, products, rfqs) {
    let totalSales = 0;
    let activeOrdersCount = 0;
    let pendingRfqsCount = 0;

    // Calculate total money from orders marked as 'مدفوعة' or completed
    Object.values(orders).forEach(o => {
        if (o.status === "مدفوعة" || o.status === "تم التوصيل") {
            totalSales += parseFloat(o.totalPrice || 0);
        }
        if (o.status !== "تم التوصيل" && o.status !== "ملغي") {
            activeOrdersCount++;
        }
    });

    // Calculate pending study RFQs
    Object.values(rfqs).forEach(r => {
        if (r.status === "قيد الدراسة") {
            pendingRfqsCount++;
        }
    });

    document.getElementById("stat-total-sales").textContent = `${totalSales.toFixed(2)} ر.س`;
    document.getElementById("stat-active-orders").textContent = activeOrdersCount;
    document.getElementById("stat-pending-rfqs").textContent = pendingRfqsCount;
    document.getElementById("stat-total-products").textContent = Object.keys(products).length;
}

// Render Orders Tab
function renderOrders(orders) {
    const tbody = document.getElementById("admin-orders-table");
    tbody.innerHTML = "";

    const sortedOrders = Object.values(orders).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">لا توجد طلبات مسجلة حالياً.</td></tr>`;
        return;
    }

    sortedOrders.forEach(o => {
        const orderDate = new Date(o.date).toLocaleDateString('ar-EG');
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--glass-border)";

        tr.innerHTML = `
            <td style="padding:15px 12px; color:#fff; font-weight:700;">${o.orderId}</td>
            <td style="padding:15px 12px; color:#fff;">${o.customerName}</td>
            <td style="padding:15px 12px; color:var(--text-muted);">${o.customerPhone || 'غير مدرج'}</td>
            <td style="padding:15px 12px; color:var(--text-muted);">${orderDate}</td>
            <td style="padding:15px 12px; color:var(--gold); font-weight:700;">${parseFloat(o.totalPrice).toFixed(2)} ر.س</td>
            <td style="padding:15px 12px;">
                <select class="form-control opt-status" data-id="${o.orderId}" style="width:130px; padding:5px; background:#111; font-size:0.9rem;">
                    <option value="بانتظار الدفع" ${o.status === 'بانتظار الدفع' ? 'selected' : ''}>بانتظار الدفع</option>
                    <option value="مدفوعة" ${o.status === 'مدفوعة' ? 'selected' : ''}>مدفوعة</option>
                    <option value="تم التوصيل" ${o.status === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option>
                    <option value="ملغي" ${o.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                </select>
            </td>
            <td style="padding:15px 12px; text-align:left;">
                <a href="invoice.html?orderId=${o.orderId}" target="_blank" class="btn-gold" style="padding:6px 12px; font-size:0.85rem;"><i class="fa-solid fa-file-invoice"></i> الفاتورة</a>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Handle Status Change on Select dropdown
    document.querySelectorAll(".opt-status").forEach(select => {
        select.addEventListener("change", (e) => {
            const orderId = e.target.getAttribute("data-id");
            const newStatus = e.target.value;
            updateOrderStatus(orderId, newStatus);
        });
    });
}

function updateOrderStatus(orderId, status) {
    const updates = {};
    updates[`orders/${orderId}/status`] = status;
    updates[`invoices/${orderId}/status`] = status; // Sync with invoice instantly

    update(ref(db), updates).then(() => {
        showToast(`تم تحديث حالة الطلب ${orderId} إلى: ${status}`, "success");
        loadDashboardData(); // Reload stats
    }).catch(err => {
        showToast("فشل تحديث حالة الطلب.", "error");
    });
}

// Add New Product to Firebase
function addNewProduct() {
    const id = "PROD-" + Date.now();
    const pData = {
        id: id,
        name: document.getElementById("p-name").value.trim(),
        price: parseFloat(document.getElementById("p-price").value),
        image: document.getElementById("p-image").value.trim(),
        description: document.getElementById("p-desc").value.trim()
    };

    set(ref(db, `products/${id}`), pData).then(() => {
        showToast("تم إضافة المنتج للمخزن بنجاح!", "success");
        document.getElementById("add-product-form").reset();
        document.getElementById("add-product-wrapper").style.display = "none";
        document.getElementById("btn-open-add-product").style.display = "inline-flex";
        loadDashboardData();
    }).catch(err => {
        showToast("فشل إضافة المنتج.", "error");
    });
}

// Render Products Tab
function renderProducts(products) {
    const tbody = document.getElementById("admin-products-table");
    tbody.innerHTML = "";

    const pList = Object.values(products);
    if (pList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">المخزن فارغ تماماً.</td></tr>`;
        return;
    }

    pList.forEach(p => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--glass-border)";

        tr.innerHTML = `
            <td style="padding:15px 12px;"><img src="${p.image}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;"></td>
            <td style="padding:15px 12px; color:#fff; font-weight:700;">${p.name}</td>
            <td style="padding:15px 12px; color:var(--gold); font-weight:700;">${parseFloat(p.price).toFixed(2)} ر.س</td>
            <td style="padding:15px 12px; color:var(--text-muted); max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.description}</td>
            <td style="padding:15px 12px; text-align:left;">
                <button class="btn-outline btn-delete-product" data-id="${p.id}" style="border-color:#e74c3c; color:#e74c3c; padding:6px 12px; font-size:0.85rem;"><i class="fa-solid fa-trash-can"></i> حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-delete-product").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const pId = btn.getAttribute("data-id");
            if (confirm("هل أنت متأكد من رغبتك بحذف هذا المنتج نهائياً من المخزن؟")) {
                remove(ref(db, `products/${pId}`)).then(() => {
                    showToast("تم حذف المنتج بنجاح.", "success");
                    loadDashboardData();
                });
            }
        });
    });
}

// Render RFQs (Services request) Tab
function renderRFQs(rfqs) {
    const tbody = document.getElementById("admin-rfqs-table");
    tbody.innerHTML = "";

    const rfqList = Object.values(rfqs).sort((a,b) => new Date(b.date) - new Date(a.date));
    if (rfqList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">لا توجد طلبات عروض أسعار هندسية حتى الآن.</td></tr>`;
        return;
    }

    rfqList.forEach(r => {
        const rfqDate = new Date(r.date).toLocaleDateString('ar-EG');
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--glass-border)";

        let serviceNameAr = "تحكم بسيط بمفتاح";
        if (r.type === "smart-home") serviceNameAr = "أتمتة ذكية كاملة";
        if (r.type === "gps") serviceNameAr = "نظام تتبع سيارات GPS";
        if (r.type === "custom-iot") serviceNameAr = "مشروع مخصص IoT";

        tr.innerHTML = `
            <td style="padding:15px 12px; color:#fff; font-weight:700;">${r.rfqId}</td>
            <td style="padding:15px 12px; color:#fff;">${r.name}</td>
            <td style="padding:15px 12px; color:var(--text-muted);">${r.phone}</td>
            <td style="padding:15px 12px; color:var(--gold); font-weight:700;">${serviceNameAr}</td>
            <td style="padding:15px 12px; color:var(--text-muted); max-width:250px; white-space:normal; line-height:1.4;">${r.details}</td>
            <td style="padding:15px 12px; color:var(--text-muted); font-size:0.85rem;">${rfqDate}</td>
            <td style="padding:15px 12px;">
                <span class="badge" style="background:${r.status === 'قيد الدراسة' ? '#e67e22' : '#2ecc71'}; padding:4px 10px; border-radius:4px; font-size:0.8rem;">${r.status}</span>
            </td>
            <td style="padding:15px 12px; text-align:left;">
                ${r.status === 'قيد الدراسة' ? `<button class="btn-gold btn-approve-rfq" data-id="${r.rfqId}" style="padding:6px 12px; font-size:0.85rem;"><i class="fa-solid fa-check"></i> اكتمال الدراسة</button>` : `<span style="color:#2ecc71; font-size:0.85rem;"><i class="fa-solid fa-circle-check"></i> مدروس</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-approve-rfq").forEach(btn => {
        btn.addEventListener("click", () => {
            const rId = btn.getAttribute("data-id");
            update(ref(db, `rfqs/${rId}`), { status: "تمت الدراسة والتواصل" }).then(() => {
                showToast(`تم تحديث حالة طلب عرض السعر ${rId}`, "success");
                loadDashboardData();
            });
        });
    });
}
