// =======================
// FIREBASE INIT (v8)
// =======================
var firebaseConfig = {
  apiKey: "AIzaSyDDQeZpHp5bFay6gRigg0pddEUqOL3cytQ",
  authDomain: "rbxvilogress.firebaseapp.com",
  projectId: "rbxvilogress",
  storageBucket: "rbxvilogress.firebasestorage.app",
  messagingSenderId: "907657980689",
  appId: "1:907657980689:web:3282ce42765c3643e47ab0",
  measurementId: "G-ZQ6EP4D1DD"
};

firebase.initializeApp(firebaseConfig);

var db = firebase.firestore();
var auth = firebase.auth();
var ADMIN_EMAIL = "dinijanuari23@gmail.com";

// =======================
// OPEN / CLOSE BOT
// =======================
firebase.firestore()
  .doc("settings/store")
  .onSnapshot(function (snap) {
    if (snap.exists && snap.data().open === false) {
      document.body.innerHTML =
        "<h3 style='text-align:center;margin-top:40px'>STORE CLOSED</h3>";
    }
  });

// =======================
// PRICE OVERRIDE (MANUAL)
// =======================
function parseOnclick(el) {
  var m = el.getAttribute("onclick")
    ?.match(/isiForm\('([^']+)','([^']+)','([^']+)'\)/);
  if (!m) return null;
  return {
    label: m[1],
    price: Number(m[2]),
    category: m[3],
    nominal: Number(m[1].replace(/[^\d]/g, ""))
  };
}

function applyPrice(el, price) {
  var info = parseOnclick(el);
  if (!info) return;
  el.setAttribute(
    "onclick",
    "isiForm('" + info.label + "','" + price + "','" + info.category + "')"
  );
  var span = el.querySelector("span");
  if (span) span.innerText = "Rp" + price.toLocaleString("id-ID");
}

function loadPrices() {
  db.collection("prices").get().then(function (snap) {
    snap.forEach(function (docu) {
      var key = docu.id;
      var price = docu.data().price;

      document.querySelectorAll(".price-box").forEach(function (box) {
        var info = parseOnclick(box);
        if (!info) return;
        var k = info.category + "__" + info.nominal;
        if (k === key) applyPrice(box, price);
      });
    });
  });
}

// =======================
// ADMIN PANEL (EDIT HARGA)
// =======================
function enableAdminEditor() {
  var panel = document.getElementById("adminPanel");
  if (!panel) return;

  var wrap = document.createElement("div");
  wrap.innerHTML = `
    <div style="margin-top:8px;font-weight:800">Edit Harga</div>
    <div id="priceEditor"></div>
    <button id="savePrices">Simpan Harga</button>
  `;
  panel.appendChild(wrap);

  var list = wrap.querySelector("#priceEditor");

  document.querySelectorAll(".price-box").forEach(function (box) {
    var info = parseOnclick(box);
    if (!info) return;
    var key = info.category + "__" + info.nominal;

    var row = document.createElement("div");
    row.innerHTML = `
      <div style="font-size:11px">${info.label}</div>
      <input data-key="${key}" type="number" value="${info.price}">
    `;
    list.appendChild(row);
  });

  document.getElementById("savePrices").onclick = function () {
    var batch = db.batch();
    list.querySelectorAll("input[data-key]").forEach(function (inp) {
      batch.set(
        db.collection("prices").doc(inp.dataset.key),
        { price: Number(inp.value) }
      );
    });
    batch.commit().then(function () {
      alert("Harga tersimpan");
      loadPrices();
    });
  };
}

// =======================
// ADMIN AUTH
// =======================
if (location.search.includes("admin=1")) {
  document.getElementById("btnAdminLogin").onclick = function () {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  };

  document.getElementById("btnAdminLogout").onclick = function () {
    auth.signOut();
  };

  auth.onAuthStateChanged(function (user) {
    if (user && user.email === ADMIN_EMAIL) {
      document.getElementById("adminPanel").style.display = "block";
      enableAdminEditor();
    }
  });
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", loadPrices);
