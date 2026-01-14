// ===============================
// FIREBASE INIT (v9 - MODULAR)
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDQeZpHp5bFay6gRigg0pddEUqOL3cytQ",
  authDomain: "rbxvilogress.firebaseapp.com",
  projectId: "rbxvilogress",
  storageBucket: "rbxvilogress.firebasestorage.app",
  messagingSenderId: "907657980689",
  appId: "1:907657980689:web:3282ce42765c3643e47ab0",
  measurementId: "G-ZQ6EP4D1DD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===============================
// GLOBAL STATE
// ===============================
let STORE_OPEN = true;
let RATE_REGULER = 0;
let RATE_USD = 0;

// ===============================
// LOAD OPEN / CLOSE
// ===============================
async function loadStoreStatus() {
  const snap = await getDoc(doc(db, "settings", "store"));
  if (snap.exists()) {
    STORE_OPEN = snap.data().open === true;
  }
}

// ===============================
// LOAD RATE
// ===============================
async function loadRates() {
  const snap = await getDoc(doc(db, "settings", "rates"));
  if (snap.exists()) {
    RATE_REGULER = snap.data().rate_reguler;
    RATE_USD = snap.data().rate_usd;
  }
}

// ===============================
// HITUNG HARGA (IDR)
// ===============================
function hitungHarga(item) {
  if (item.category === "reguler") {
    return item.usd * RATE_REGULER;
  }

  if (item.category === "basic" || item.category === "premium") {
    return item.usd * RATE_USD;
  }

  if (item.category === "mix") {
    let total = 0;
    item.parts.forEach(p => {
      if (p.category === "reguler") {
        total += p.usd * RATE_REGULER;
      } else {
        total += p.usd * RATE_USD;
      }
    });
    return total;
  }

  return 0;
}

// ===============================
// LOAD PRICE LIST (TOMBOL)
// ===============================
async function loadPriceList() {
  const snap = await getDocs(collection(db, "pricelist"));
  snap.forEach(docu => {
    const item = docu.data();
    if (!item.active) return;

    const harga = hitungHarga(item);

    // ⬇️ PENTING
    // Di SINI kamu panggil fungsi lama kamu
    // untuk bikin tombol + onclick isiForm(...)
    //
    // contoh (sesuaikan dengan HTML lama):
    // renderButton(item.robux, harga, item.category);
  });
}

// ===============================
// INIT
// ===============================
(async () => {
  await loadStoreStatus();
  if (!STORE_OPEN) return;

  await loadRates();
  await loadPriceList();
})();
