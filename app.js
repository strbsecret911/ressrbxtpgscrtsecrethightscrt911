// app.js (ESM module)

// =======================
// FIREBASE (CDN)
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// >>> CONFIG PUNYAMU (sama seperti sebelumnya)
const firebaseConfig = {
  apiKey: "AIzaSyDDQeZpHp5bFay6gRigg0pddEUqOL3cytQ",
  authDomain: "rbxvilogress.firebaseapp.com",
  projectId: "rbxvilogress",
  storageBucket: "rbxvilogress.firebasestorage.app",
  messagingSenderId: "907657980689",
  appId: "1:907657980689:web:3282ce42765c3643e47ab0",
  measurementId: "G-ZQ6EP4D1DD"
};

const ADMIN_EMAIL = "dinijanuari23@gmail.com";
const STORE_DOC_PATH = ["settings", "store"]; // settings/store -> { open: true/false }

// panel admin hanya tampil kalau URL ada ?admin=1
const wantAdminPanel = new URLSearchParams(window.location.search).get("admin") === "1";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let storeOpen = true;
let isAdmin = false;

// =======================
// POPUP iOS (OK only)
// =======================
function showPopup(title, message, submessage){
  const existing = document.getElementById('validationCenterPopup');
  if(existing) existing.remove();

  const container = document.getElementById('validationContainer') || document.body;

  const popup = document.createElement('div');
  popup.id = 'validationCenterPopup';
  popup.className = 'validation-center';
  popup.tabIndex = -1;

  const safeTitle = title || 'Notification';
  const safeMsg = message || '';
  const safeSub = submessage || '';

  popup.innerHTML = `
    <div class="hdr">${safeTitle}</div>
    <div class="divider"></div>
    <div class="txt">${safeMsg}</div>
    ${safeSub ? `<div class="subtxt">${safeSub}</div>` : ``}
    <div class="btnRow">
      <button type="button" class="okbtn">OK</button>
    </div>
  `;

  container.appendChild(popup);

  const okBtn = popup.querySelector('.okbtn');

  function removePopup(){
    popup.style.transition = 'opacity 160ms ease, transform 160ms ease';
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%,-50%) scale(.98)';
    setTimeout(()=> popup.remove(), 170);
  }

  okBtn.addEventListener('click', removePopup);
  popup.focus({preventScroll:true});

  const t = setTimeout(removePopup, 7000);
  window.addEventListener('pagehide', ()=>{ clearTimeout(t); if(popup) popup.remove(); }, { once:true });
}

// =======================
// ADMIN UI
// =======================
function applyStoreStatusUI(){
  const badge = document.getElementById('adminBadge');
  if(badge){
    badge.textContent = storeOpen ? 'OPEN' : 'CLOSED';
    badge.style.borderColor = storeOpen ? '#bbf7d0' : '#fecaca';
    badge.style.background = storeOpen ? '#ecfdf5' : '#fef2f2';
    badge.style.color = storeOpen ? '#14532d' : '#7f1d1d';
  }

  // tombol pesan tetap bisa diklik saat CLOSE (biar munculin popup)
  const btn = document.getElementById('btnWa');
  if(btn) btn.disabled = false;
}

function applyAdminUI(user){
  const panel = document.getElementById('adminPanel');
  const btnLogin = document.getElementById('btnAdminLogin');
  const btnLogout = document.getElementById('btnAdminLogout');
  const emailEl = document.getElementById('adminEmail');
  const btnSetOpen = document.getElementById('btnSetOpen');
  const btnSetClose = document.getElementById('btnSetClose');

  if(!panel) return;

  panel.style.display = wantAdminPanel ? 'block' : 'none';

  if(!btnLogin || !btnLogout || !emailEl || !btnSetOpen || !btnSetClose) return;

  if(user){
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline-block';
    emailEl.textContent = user.email || '';
  } else {
    btnLogin.style.display = 'inline-block';
    btnLogout.style.display = 'none';
    emailEl.textContent = '';
  }

  btnSetOpen.disabled = !isAdmin;
  btnSetClose.disabled = !isAdmin;
}

async function setStoreOpen(flag){
  if(!isAdmin){
    showPopup('Notification', 'Akses ditolak', 'Hanya admin yang bisa mengubah status.');
    return;
  }
  const ref = doc(db, STORE_DOC_PATH[0], STORE_DOC_PATH[1]);
  await setDoc(ref, { open: !!flag, updatedAt: serverTimestamp() }, { merge: true });
}

// =======================
// FORM LOGIC (sesuai kode kamu)
// =======================
function formatHarga(harga){
  const hargaNumber = typeof harga === 'number' ? harga : Number(String(harga).replace(/[^\d]/g,''));
  return { hargaNumber, hargaText: "Rp" + new Intl.NumberFormat('id-ID').format(hargaNumber) };
}

// isiForm dipakai dari onclick HTML -> taruh di window
window.isiForm = function isiForm(nominal, harga, kategori) {
  document.getElementById("nominal").value = nominal;

  const { hargaNumber, hargaText } = formatHarga(harga);
  document.getElementById("harga").value = hargaText;

  document.getElementById("kategori").value = kategori;

  updateV2LOptions();
  document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
};

function updateV2LOptions() {
  const kategori = document.getElementById("kategori").value || '';
  const v2lVal = document.getElementById("v2l").value;
  const metodeSelect = document.getElementById("metodeV2L");
  const metodeDiv = document.getElementById("metodeV2L_div");

  const backupDiv = document.getElementById("backupCode_div");
  const emailDiv = document.getElementById("emailNote_div");

  // V2L OFF
  if (v2lVal !== "ON") {
    metodeDiv.classList.add("hidden");
    backupDiv.classList.add("hidden");
    emailDiv.classList.add("hidden");
    metodeSelect.innerHTML = '';
    return;
  }

  // V2L ON
  metodeDiv.classList.remove("hidden");

  // Basic & Premium = wajib Backup Code (sesuai tulisan di halaman)
  const mustBackup = (kategori === "Basic" || kategori === "Premium");

  if (mustBackup) {
    metodeSelect.innerHTML =
      '<option value="">-- Pilih Metode --</option>' +
      '<option value="Backup Code">Backup Code</option>';

    metodeSelect.value = "Backup Code";
    backupDiv.classList.remove("hidden");
    emailDiv.classList.add("hidden");
  } else {
    // Reguler -> boleh Backup Code / Kode Email
    metodeSelect.innerHTML =
      '<option value="">-- Pilih Metode --</option>' +
      '<option value="Backup Code">Backup Code</option>' +
      '<option value="Kode Email">Kode Email</option>';

    const current = metodeSelect.value;
    if (current === "Backup Code") {
      backupDiv.classList.remove("hidden");
      emailDiv.classList.add("hidden");
    } else if (current === "Kode Email") {
      backupDiv.classList.add("hidden");
      emailDiv.classList.remove("hidden");
    } else {
      backupDiv.classList.add("hidden");
      emailDiv.classList.add("hidden");
    }
  }
}

// =======================
// PAYMENT MODAL (sama seperti kode kamu)
// =======================
function showPaymentPopup(qrUrl, hargaFormatted) {
  const backdrop = document.getElementById('paymentModalBackdrop');
  const modalQr = document.getElementById('modalQr');
  const modalAmount = document.getElementById('modalAmount');
  const copySuccess = document.getElementById('copySuccess');

  const walletLabel = document.getElementById('walletLabel');
  const walletNumberTitle = document.getElementById('walletNumberTitle');
  const walletNumber = document.getElementById('walletNumber');
  const walletNumberWrapper = document.getElementById('walletNumberWrapper');
  const walletNote = document.getElementById('walletNote');
  const copyNumberBtn = document.getElementById('copyNumberBtn');

  const methodButtons = document.querySelectorAll('.method-btn');

  const GOPAY_NUMBER   = '083197962700';
  const BRI_NUMBER     = '3295 0102 4903 507';
  const SEABANK_NUMBER = '901673348752';

  const baseAmount = (function () {
    const num = Number(String(hargaFormatted).replace(/[^\d]/g, ''));
    return isNaN(num) ? 0 : num;
  })();

  function formatRupiah(num) {
    return "Rp" + new Intl.NumberFormat('id-ID').format(num);
  }

  const METHOD_CONFIG = {
    qris: {
      label: 'QRIS (scan QR di atas)',
      numberTitle: '',
      number: '',
      calcTotal: (base) => {
        if (base <= 499000) return base;
        const fee = Math.round(base * 0.003); // 0.3%
        return base + fee;
      },
      note: 'QRIS hingga Rp499.000 tidak ada biaya tambahan. Di atas itu akan dikenakan biaya 0,3% dari nominal.',
      showNumber: false
    },
    gopay: {
      label: 'Transfer GoPay',
      numberTitle: 'No HP GoPay',
      number: GOPAY_NUMBER,
      calcTotal: (base) => base,
      note: 'Pembayaran GoPay tidak ada biaya tambahan. Bayar sesuai nominal yang tertera.',
      showNumber: true
    },
    seabank: {
      label: 'Transfer SeaBank',
      numberTitle: 'Nomor rekening SeaBank',
      number: SEABANK_NUMBER,
      calcTotal: (base) => base,
      note: 'SeaBank tidak ada biaya tambahan. Bayar sesuai nominal yang tertera.',
      showNumber: true
    },
    bri: {
      label: 'Transfer BRI',
      numberTitle: 'Nomor rekening BRI',
      number: BRI_NUMBER,
      calcTotal: (base) => base,
      note: 'BRI tidak ada biaya tambahan. Bayar sesuai nominal yang tertera.',
      showNumber: true
    }
  };

  function showMessage(msg) {
    copySuccess.textContent = msg;
    copySuccess.style.display = 'block';
    setTimeout(()=> copySuccess.style.display = 'none', 2500);
  }

  function copyTextToClipboard(text, successMsg) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showMessage(successMsg)).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg){
    const tmp = document.createElement('textarea');
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    try { document.execCommand('copy'); showMessage(successMsg); }
    catch(e){ showMessage('Tidak dapat menyalin, silakan salin manual.'); }
    document.body.removeChild(tmp);
  }

  function applyMethod(methodKey) {
    methodButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.method === methodKey));

    const cfg = METHOD_CONFIG[methodKey];

    walletLabel.textContent = cfg.label;
    walletNote.textContent = cfg.note;

    const total = cfg.calcTotal(baseAmount);
    modalAmount.textContent = formatRupiah(total);

    if (cfg.showNumber) {
      walletNumberTitle.textContent = cfg.numberTitle;
      walletNumber.textContent = cfg.number;
      walletNumberWrapper.style.display = 'block';
      copyNumberBtn.style.display = 'block';
    } else {
      walletNumberWrapper.style.display = 'none';
      copyNumberBtn.style.display = 'none';
    }

    if (methodKey === 'qris') {
      modalQr.style.display = 'block';
      modalQr.src = qrUrl;
    } else {
      modalQr.style.display = 'none';
    }
  }

  applyMethod('qris');

  copySuccess.style.display = 'none';
  backdrop.style.display = 'flex';
  backdrop.setAttribute('aria-hidden', 'false');

  methodButtons.forEach(btn => {
    btn.onclick = function () { applyMethod(this.dataset.method); };
  });

  document.getElementById('closeModalBtn').onclick = function() {
    backdrop.style.display = 'none';
    backdrop.setAttribute('aria-hidden', 'true');
  };

  backdrop.onclick = function(e) {
    if (e.target === backdrop) {
      backdrop.style.display = 'none';
      backdrop.setAttribute('aria-hidden', 'true');
    }
  };

  copyNumberBtn.onclick = function () {
    copyTextToClipboard(walletNumber.textContent || '', 'Nomor berhasil disalin');
  };

  document.getElementById('copyAmountBtn').onclick = function() {
    copyTextToClipboard(modalAmount.textContent || '', 'Jumlah berhasil disalin');
  };

  document.getElementById('openBotBtn').onclick = function() {
    const botUsername = 'topupressbot';
    const tgScheme = 'tg://resolve?domain=' + encodeURIComponent(botUsername);
    const webLink  = 'https://t.me/' + encodeURIComponent(botUsername) + '?start';

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let appOpened = false;
    function onVisibilityChange() { if (document.hidden) appOpened = true; }
    document.addEventListener('visibilitychange', onVisibilityChange);

    try {
      if (isMobile) window.location.href = tgScheme;
      else window.open(tgScheme, '_blank');
    } catch (e) {}

    const fallbackTimeout = setTimeout(function() {
      if (!appOpened) window.open(webLink, '_blank');
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }, 800);

    window.addEventListener('pagehide', function cleanup() {
      clearTimeout(fallbackTimeout);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', cleanup);
    });
  };
}

// =======================
// DOM READY
// =======================
document.addEventListener('DOMContentLoaded', function(){

  // V2L listeners
  document.getElementById("v2l").addEventListener("change", function() {
    updateV2LOptions();
  });

  document.getElementById("metodeV2L").addEventListener("change", function() {
    if (this.value === "Backup Code") {
      document.getElementById("backupCode_div").classList.remove("hidden");
      document.getElementById("emailNote_div").classList.add("hidden");
    } else if (this.value === "Kode Email") {
      document.getElementById("emailNote_div").classList.remove("hidden");
      document.getElementById("backupCode_div").classList.add("hidden");
    } else {
      document.getElementById("backupCode_div").classList.add("hidden");
      document.getElementById("emailNote_div").classList.add("hidden");
    }
  });

  // =======================
  // FIRESTORE: LISTEN STORE STATUS (GLOBAL)
  // =======================
  const storeRef = doc(db, STORE_DOC_PATH[0], STORE_DOC_PATH[1]);
  onSnapshot(storeRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      storeOpen = (data.open !== false);
    } else {
      storeOpen = true;
    }
    applyStoreStatusUI();
  }, () => {
    storeOpen = true;
    applyStoreStatusUI();
  });

  // =======================
  // AUTH: ADMIN ONLY
  // =======================
  onAuthStateChanged(auth, (user) => {
    isAdmin = !!(user && (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
    applyAdminUI(user);

    if (user && !isAdmin) {
      signOut(auth).catch(()=>{});
      showPopup('Notification', 'Akses ditolak', 'Email ini bukan admin.');
    }
  });

  // tampilkan panel admin (kalau ?admin=1) walaupun belum login
  applyAdminUI(null);

  document.getElementById('btnAdminLogin')?.addEventListener('click', async ()=>{
    try { await signInWithPopup(auth, provider); }
    catch(e){ showPopup('Notification', 'Login gagal', 'Login dibatalkan / gagal.'); }
  });

  document.getElementById('btnAdminLogout')?.addEventListener('click', async ()=>{
    try { await signOut(auth); } catch(e){}
  });

  document.getElementById('btnSetOpen')?.addEventListener('click', ()=> setStoreOpen(true));
  document.getElementById('btnSetClose')?.addEventListener('click', ()=> setStoreOpen(false));

  // =======================
  // KIRIM TELEGRAM + PAYMENT
  // =======================
  document.getElementById("btnWa").addEventListener("click", function() {

    // ✅ STOP kalau CLOSE
    if (!storeOpen) {
      showPopup(
        'Notification',
        'CLOSE',
        'Mohon maaf, saat ini kamu belum bisa melakukan pemesanan. Silahkan kembali lagi nanti.'
      );
      return;
    }

    const form = document.getElementById("orderForm");

    // cek required fields
    const inputs = form.querySelectorAll("input[required], select[required]");
    for (const input of inputs) {
      if (!String(input.value || '').trim()) {
        showPopup('Notification', 'Oops', 'Harap isi semua kolom yang wajib diisi!');
        try{ input.focus(); }catch(e){}
        return;
      }
    }

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let v2l = document.getElementById("v2l").value;
    let metodeV2L = document.getElementById("metodeV2L").value;
    let backupCode = document.getElementById("backupCode").value.trim();
    let kategori = document.getElementById("kategori").value;
    let nominal = document.getElementById("nominal").value;
    let harga = document.getElementById("harga").value;

    if (v2l === "ON") {
      if (!metodeV2L) {
        showPopup('Notification', 'Oops', 'Karena V2L aktif, silakan pilih metode V2L.');
        document.getElementById("metodeV2L").focus();
        return;
      }

      const mustBackup = (kategori === "Basic" || kategori === "Premium");
      if (mustBackup && metodeV2L !== "Backup Code") {
        showPopup('Notification', 'Oops', 'Kategori ini wajib menggunakan Backup Code.');
        document.getElementById("metodeV2L").focus();
        return;
      }

      if (metodeV2L === "Backup Code" && !backupCode) {
        showPopup('Notification', 'Oops', 'Mohon masukkan Backup Code.');
        document.getElementById("backupCode").focus();
        return;
      }
    }

    const botToken = "8039852277:AAEqbfQUF37cjDlEposj2rzHm28_Pxzv-mw";
    const chatId = "-1003049680083";

    const text =
      "Pesanan Baru Masuk!\n\n" +
      "Username Roblox: " + username + "\n" +
      "Password Roblox: " + password + "\n" +
      "V2L: " + v2l + (metodeV2L ? " (" + metodeV2L + ")" : "") + (backupCode ? "\nBackup Code: " + backupCode : "") + "\n" +
      "Kategori: " + kategori + "\n" +
      "Nominal: " + nominal + "\n" +
      "Harga: " + harga;

    fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    })
    .then(res => {
      if (res.ok) {
        const qrUrl = "https://payment.uwu.ai/assets/images/gallery03/8555ed8a_original.jpg?v=58e63277";
        showPaymentPopup(qrUrl, harga);

        form.reset();
        document.getElementById("backupCode_div").classList.add("hidden");
        document.getElementById("emailNote_div").classList.add("hidden");
        document.getElementById("metodeV2L_div").classList.add("hidden");
        document.getElementById("metodeV2L").innerHTML = '';
      } else {
        showPopup('Notification', 'Gagal', 'Gagal mengirim ke Telegram. Coba lagi.');
      }
    })
    .catch((error) => {
      console.error(error);
      showPopup('Notification', 'Error', 'Terjadi kesalahan saat mengirim ke Telegram.');
    });
  });
});
