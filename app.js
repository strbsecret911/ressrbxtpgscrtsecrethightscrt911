const WHATSAPP_NUMBER = "6283197962700";

function showPopup(title, message, submessage) {
  const existing = document.getElementById('validationCenterPopup');
  if (existing) existing.remove();

  const container = document.getElementById('validationContainer') || document.body;

  const popup = document.createElement('div');
  popup.id = 'validationCenterPopup';
  popup.className = 'validation-center';
  popup.tabIndex = -1;

  popup.innerHTML = `
    <div class="hdr">${title || 'Notification'}</div>
    <div class="divider"></div>
    <div class="txt">${message || ''}</div>
    ${submessage ? `<div class="subtxt">${submessage}</div>` : ``}
    <div class="btnRow">
      <button type="button" class="okbtn">OK</button>
    </div>
  `;

  container.appendChild(popup);

  const okBtn = popup.querySelector('.okbtn');

  function removePopup() {
    popup.style.transition = 'opacity 160ms ease, transform 160ms ease';
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%,-50%) scale(.98)';
    setTimeout(() => popup.remove(), 170);
  }

  okBtn.addEventListener('click', removePopup);
  popup.focus({ preventScroll: true });

  const t = setTimeout(removePopup, 7000);
  window.addEventListener('pagehide', () => {
    clearTimeout(t);
    if (popup) popup.remove();
  }, { once: true });
}

function formatHarga(harga) {
  const hargaNumber = typeof harga === 'number'
    ? harga
    : Number(String(harga).replace(/[^\d]/g, ''));

  return {
    hargaNumber,
    hargaText: "Rp" + new Intl.NumberFormat('id-ID').format(hargaNumber)
  };
}

window.isiForm = function isiForm(nominal, harga, kategori) {
  document.getElementById("nominal").value = nominal;

  const { hargaText } = formatHarga(harga);
  document.getElementById("harga").value = hargaText;

  document.getElementById("kategori").value = kategori;

  updateV2LOptions();
  document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
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

function resetFormUI(form) {
  form.reset();
  document.getElementById("backupCode_div").classList.add("hidden");
  document.getElementById("emailNote_div").classList.add("hidden");
  document.getElementById("metodeV2L_div").classList.add("hidden");
  document.getElementById("metodeV2L").innerHTML = '';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("v2l")?.addEventListener("change", function () {
    updateV2LOptions();
  });

  document.getElementById("metodeV2L")?.addEventListener("change", function () {
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

  document.getElementById("btnWa")?.addEventListener("click", function () {
    const form = document.getElementById("orderForm");
    const inputs = form.querySelectorAll("input[required], select[required]");

    for (const input of inputs) {
      if (!String(input.value || '').trim()) {
        showPopup('Notification', 'Oops', 'Harap isi semua kolom yang wajib diisi!');
        try { input.focus(); } catch (e) {}
        return;
      }
    }

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const v2l = document.getElementById("v2l").value;
    const metodeV2L = document.getElementById("metodeV2L").value;
    const backupCode = document.getElementById("backupCode").value.trim();
    const kategori = document.getElementById("kategori").value;
    const nominal = document.getElementById("nominal").value;
    const harga = document.getElementById("harga").value;

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

    const message =
      `Pesanan Baru Masuk!\n\n` +
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
      'Notification',
      'Berhasil',
      'Pesanan sudah disiapkan ke WhatsApp. Silakan lanjut kirim pesan di WhatsApp.'
    );

    resetFormUI(form);
  });
});
