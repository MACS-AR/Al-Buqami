document.addEventListener("DOMContentLoaded", () => {
    // Hide Loading Screen
    const loader = document.getElementById("loading-screen");
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = "0";
            loader.style.visibility = "hidden";
        }, 800);
    }

    // Initialize Mobile Menu (If responsive toggle exists)
    const toggleBtn = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener("click", () => {
            navLinks.style.display = navLinks.style.display === "flex" ? "none" : "flex";
            navLinks.style.flexDirection = "column";
            navLinks.style.position = "absolute";
            navLinks.style.top = "70px";
            navLinks.style.left = "0";
            navLinks.style.width = "100%";
            navLinks.style.background = "rgba(10,10,10,0.95)";
            navLinks.style.padding = "20px";
            navLinks.style.borderBottom = "1px solid var(--gold)";
        });
    }

    // Cart and Wishlist Badges Counter Initialization
    updateGlobalBadges();
});

export function updateGlobalBadges() {
    const cart = JSON.parse(localStorage.getItem("albuqami_cart")) || [];
    const wishlist = JSON.parse(localStorage.getItem("albuqami_wishlist")) || [];
    
    const cartBadge = document.getElementById("cart-badge");
    const wishlistBadge = document.getElementById("wishlist-badge");
    
    if (cartBadge) cartBadge.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (wishlistBadge) wishlistBadge.textContent = wishlist.length;
}
