import { db, ref, get, child, push, set, showToast, toggleSkeleton } from "./firebase.js";
import { updateGlobalBadges } from "./app.js";

let productsList = [];

document.addEventListener("DOMContentLoaded", () => {
    loadStoreProducts();
    setupRoutingEvents();
    setupCheckout();

    const loader = document.getElementById("loading-screen");
    if (loader) loader.style.display = "none";
});

// Setup routing views based on query parameter or buttons
function setupRoutingEvents() {
    const btnWishlist = document.getElementById("btn-wishlist");
    const btnCart = document.getElementById("btn-cart");
    const back1 = document.getElementById("back-to-store-1");
    const back2 = document.getElementById("back-to-store-2");

    if (btnWishlist) btnWishlist.addEventListener("click", () => switchView("wishlist"));
    if (btnCart) btnCart.addEventListener("click", () => switchView("cart"));
    if (back1) back1.addEventListener("click", () => switchView("store"));
    if (back2) back2.addEventListener("click", () => switchView("store"));

    // Watch URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view === 'cart') switchView('cart');
    else if (view === 'wishlist') switchView('wishlist');

    // Search and filters
    const searchInput = document.getElementById("store-search");
    const catSelect = document.getElementById("filter-category");
    const sortSelect = document.getElementById("sort-products");

    if (searchInput) searchInput.addEventListener("input", filterProducts);
    if (catSelect) catSelect.addEventListener("change", filterProducts);
    if (sortSelect) sortSelect.addEventListener("change", filterProducts);
}

function switchView(viewName) {
    document.getElementById("view-store").style.display = viewName === "store" ? "block" : "none";
    document.getElementById("view-wishlist").style.display = viewName === "wishlist" ? "block" : "none";
    document.getElementById("view-cart").style.display = viewName === "cart" ? "block" : "none";

    if (viewName === "wishlist") renderWishlistView();
    if (viewName === "cart") renderCartView();
}

// Fetch all products from Database
function loadStoreProducts() {
    toggleSkeleton('products-grid', 6, true);
    get(child(ref(db), 'products')).then((snapshot) => {
        toggleSkeleton('products-grid', 0, false);
        if (snapshot.exists()) {
            productsList = [];
            const data = snapshot.val();
            for (let id in data) {
                productsList.push({ id, ...data[id] });
            }
            renderProducts(productsList);
        } else {
            document.getElementById('products-grid').innerHTML = '<p style="text-align:center; grid-column:1/-1;">لا توجد أجهزة متوفرة في المتجر حالياً.</p>';
        }
    }).catch((err) => {
        toggleSkeleton('products-grid', 0, false);
        document.getElementById('products-grid').innerHTML = '<p style="text-align:center; grid-column:1/-1; color:red;">خطأ أثناء جلب المنتجات.</p>';
    });
}

function renderProducts(products) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;
    grid.innerHTML = "";

    products.forEach(p => {
        const item = document.createElement("div");
        item.className = "glass-panel";
        item.style.padding = "20px";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.justify = "space-between";

        item.innerHTML = `
            <div style="position:relative;">
                <img src="${p.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" style="width:100%; height:220px; object-fit:cover; border-radius:12px; border:1px solid rgba(212,175,55,0.15);" alt="${p.name}">
                ${p.oldPrice && parseFloat(p.oldPrice) > parseFloat(p.price) ? `
                    <span style="position:absolute; top:10px; right:10px; background:red; color:#fff; font-weight:700; padding:4px 10px; border-radius:6px; font-size:0.8rem;">خصم</span>
                ` : ''}
            </div>
            <h3 style="margin:15px 0 10px; font-size:1.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</h3>
            <p style="color:var(--text-muted); font-size:0.85rem; height:50px; overflow:hidden; margin-bottom:15px;">${p.description || ''}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <span style="color:var(--gold); font-weight:700; font-size:1.25rem;">${p.price} ر.س</span>
                    ${p.oldPrice ? `<p style="text-decoration:line-through; font-size:0.85rem; color:var(--text-muted);">${p.oldPrice} ر.س</p>` : ''}
                </div>
                <span style="font-size:0.8rem; color:#2ecc71;">الضمان: ${p.warranty || 'سنتين'}</span>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="product.html?id=${p.id}" class="btn-outline" style="padding:10px; flex:1; text-align:center; text-decoration:none; font-size:0.85rem;">تفاصيل الأداء</a>
                <button class="btn-gold btn-add-to-cart" data-id="${p.id}" style="padding:10px 15px;"><i class="fa-solid fa-cart-plus"></i></button>
            </div>
        `;
        grid.appendChild(item);
    });

    // Handle adding to cart on dynamic items
    grid.querySelectorAll('.btn-add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const prod = productsList.find(x => x.id === id);
            addToCart(prod);
        });
    });
}

function filterProducts() {
    const text = document.getElementById("store-search").value.toLowerCase();
    const cat = document.getElementById("filter-category").value;
    const sort = document.getElementById("sort-products").value;

    let filtered = productsList.filter(p => {
        const matchText = p.name.toLowerCase().includes(text) || (p.description && p.description.toLowerCase().includes(text));
        const matchCat = cat === "all" || p.category === cat;
        return matchText && matchCat;
    });

    if (sort === "price-low") {
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sort === "price-high") {
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    renderProducts(filtered);
}

// Global Operations
function addToCart(product) {
    if(!product) return;
    let cart = JSON.parse(localStorage.getItem("albuqami_cart")) || [];
    const idx = cart.findIndex(item => item.id === product.id);
    if(idx > -1) {
        cart[idx].quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: product.imageUrl,
            quantity: 1
        });
    }
    localStorage.setItem("albuqami_cart", JSON.stringify(cart));
    updateGlobalBadges();
    showToast("تم إضافة الجهاز للسلة بنجاح!", "success");
}

function renderWishlistView() {
    const grid = document.getElementById("wishlist-grid");
    const wishlistIds = JSON.parse(localStorage.getItem("albuqami_wishlist")) || [];
    grid.innerHTML = "";

    if (wishlistIds.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">لا توجد أي أجهزة في قائمتك المفضلة حالياً.</p>';
        return;
    }

    const filtered = productsList.filter(p => wishlistIds.includes(p.id));
    
    filtered.forEach(p => {
        const item = document.createElement("div");
        item.className = "glass-panel";
        item.style.padding = "20px";
        item.innerHTML = `
            <img src="${p.imageUrl}" style="width:100%; height:180px; object-fit:cover; border-radius:12px;" alt="">
            <h3 style="margin:15px 0;">${p.name}</h3>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <span style="color:var(--gold); font-weight:700;">${p.price} ر.س</span>
                <button class="btn-outline btn-remove-wishlist" data-id="${p.id}" style="padding:5px 10px; color:red; border-color:red;"><i class="fa-solid fa-trash"></i></button>
            </div>
            <button class="btn-gold btn-add-to-cart-from-wish" data-id="${p.id}" style="width:100%; justify-content:center;"><i class="fa-solid fa-basket-shopping"></i> نقل للسلة</button>
        `;
        grid.appendChild(item);
    });

    grid.querySelectorAll('.btn-remove-wishlist').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            let wish = JSON.parse(localStorage.getItem("albuqami_wishlist")) || [];
            wish = wish.filter(x => x !== id);
            localStorage.setItem("albuqami_wishlist", JSON.stringify(wish));
            updateGlobalBadges();
            renderWishlistView();
        });
    });

    grid.querySelectorAll('.btn-add-to-cart-from-wish').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const prod = productsList.find(x => x.id === id);
            addToCart(prod);
        });
    });
}

function renderCartView() {
    const list = document.getElementById("cart-items-list");
    const cart = JSON.parse(localStorage.getItem("albuqami_cart")) || [];
    const emptyMsg = document.getElementById("cart-empty-message");
    const wrapper = document.getElementById("cart-content-wrapper");

    if (cart.length === 0) {
        if (wrapper) wrapper.style.display = "none";
        if (emptyMsg) emptyMsg.style.display = "block";
        return;
    }

    if (wrapper) wrapper.style.display = "grid";
    if (emptyMsg) emptyMsg.style.display = "none";

    list.innerHTML = "";
    let subtotal = 0;

    cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;
        const row = document.createElement("div");
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--glass-border); padding-bottom:15px; flex-wrap:wrap; gap:15px;";
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${item.image || 'https://via.placeholder.com/100'}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
                <div>
                    <h4 style="color:#fff;">${item.name}</h4>
                    <span style="color:var(--gold); font-size:0.9rem;">${item.price} ر.س</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="display:flex; border:1px solid var(--glass-border); border-radius:6px; overflow:hidden;">
                    <button class="btn-qty" data-index="${index}" data-action="dec" style="background:#222; border:none; color:#fff; width:30px; height:30px; cursor:pointer;">-</button>
                    <span style="padding:4px 12px; background:#111;">${item.quantity}</span>
                    <button class="btn-qty" data-index="${index}" data-action="inc" style="background:#222; border:none; color:#fff; width:30px; height:30px; cursor:pointer;">+</button>
                </div>
                <button class="btn-delete-item" data-index="${index}" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        list.appendChild(row);
    });

    document.getElementById("cart-subtotal").textContent = `${subtotal} ر.س`;
    document.getElementById("cart-total").textContent = `${subtotal} ر.س`;

    // Handle interactive Quantity buttons inside cart
    list.querySelectorAll('.btn-qty').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            const action = btn.getAttribute('data-action');
            let currentCart = JSON.parse(localStorage.getItem("albuqami_cart")) || [];
            if(action === 'inc') {
                currentCart[idx].quantity += 1;
            } else if (action === 'dec' && currentCart[idx].quantity > 1) {
                currentCart[idx].quantity -= 1;
            }
            localStorage.setItem("albuqami_cart", JSON.stringify(currentCart));
            updateGlobalBadges();
            renderCartView();
        });
    });

    list.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            let currentCart = JSON.parse(localStorage.getItem("albuqami_cart")) || [];
            currentCart.splice(idx, 1);
            localStorage.setItem("albuqami_cart", JSON.stringify(currentCart));
            updateGlobalBadges();
            renderCartView();
        });
    });
}

// Checkout Operations - Saving orders into Firebase default database RTDB
function setupCheckout() {
    const form = document.getElementById("checkout-form");
    if(!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const cart = JSON.parse(localStorage.getItem("albuqami_cart")) || [];
        if (cart.length === 0) {
            showToast("سلتك فارغة!", "error");
            return;
        }

        const orderId = "BQ-" + Math.floor(100000 + Math.random() * 900000);
        const orderData = {
            orderId: orderId,
            customerName: document.getElementById("cust-name").value.trim(),
            customerPhone: document.getElementById("cust-phone").value.trim(),
            customerEmail: document.getElementById("cust-email").value.trim(),
            city: document.getElementById("cust-city").value.trim(),
            address: document.getElementById("cust-address").value.trim(),
            products: cart,
            total: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
            date: new Date().toISOString(),
            status: "جديد"
        };

        const newOrderRef = ref(db, `orders/${orderId}`);
        set(newOrderRef, orderData).then(() => {
            // Also create instant electronic invoice linked
            const invoiceRef = ref(db, `invoices/${orderId}`);
            set(invoiceRef, {
                invoiceId: "INV-" + Math.floor(1000 + Math.random() * 9000),
                orderId: orderId,
                customerName: orderData.customerName,
                products: orderData.products,
                total: orderData.total,
                status: "بانتظار الدفع",
                date: orderData.date
            });

            showToast(`تم إرسال الطلب بنجاح برقم: ${orderId}`, "success");
            localStorage.removeItem("albuqami_cart");
            updateGlobalBadges();
            setTimeout(() => {
                window.location.href = `invoice.html?orderId=${orderId}`;
            }, 2000);
        }).catch((err) => {
            showToast("فشل إرسال الطلب، الرجاء المحاولة مجدداً.", "error");
        });
    });
}
