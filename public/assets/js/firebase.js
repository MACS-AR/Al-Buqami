// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, child, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgRkceRq7FRbhCevLlULYNy-A5Tl_cr0w",
  authDomain: "sr-test-c9e06.firebaseapp.com",
  databaseURL: "https://sr-test-c9e06-default-rtdb.firebaseio.com",
  projectId: "sr-test-c9e06",
  storageBucket: "sr-test-c9e06.firebasestorage.app",
  messagingSenderId: "658396508062",
  appId: "1:658396508062:web:ca94047d35122e2876308f",
  measurementId: "G-8955CHF37F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global Toast Notification Helper
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; left: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fade-in`;
    toast.style.cssText = `
        background: rgba(26, 26, 26, 0.85);
        color: #fff;
        border-right: 4px solid ${type === 'success' ? '#d4af37' : '#ff4444'};
        padding: 15px 25px;
        border-radius: 8px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        font-family: 'Cairo', sans-serif;
        direction: rtl;
        min-width: 250px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    toast.innerHTML = `<span>${message}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Global Skeleton Loader Generator
function toggleSkeleton(containerId, count = 3, show = true) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!show) {
        const skeletons = container.querySelectorAll('.skeleton-loader-item');
        skeletons.forEach(s => s.remove());
        return;
    }
    container.innerHTML = '';
    for(let i=0; i<count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-loader-item';
        skeleton.style.cssText = `
            background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
            background-size: 200% 100%;
            animation: loading-skeleton 1.5s infinite;
            height: 250px;
            border-radius: 12px;
            border: 1px solid rgba(212, 175, 55, 0.1);
        `;
        container.appendChild(skeleton);
    }
}

export { auth, db, showToast, toggleSkeleton, onAuthStateChanged, signInWithEmailAndPassword, signOut, ref, set, get, update, remove, child, onValue, push };
