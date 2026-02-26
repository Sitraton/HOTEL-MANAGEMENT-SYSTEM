if (!localStorage.getItem("admin_token")) {
  window.location.href = "./login.html";
}

const statusFilter = document.getElementById("statusFilter");
const fromFilter = document.getElementById("fromFilter");
const toFilter = document.getElementById("toFilter");

const btnApply = document.getElementById("btnApply");
const btnClear = document.getElementById("btnClear");
const btnLogout = document.getElementById("btnLogout");

const statusBox = document.getElementById("statusBox");
const metaText = document.getElementById("metaText");
const list = document.getElementById("list");

function showStatus(message, kind = "info") {
  statusBox.style.display = "block";
  statusBox.textContent = message;
  statusBox.style.borderColor =
    kind === "error" ? "rgba(251, 113, 133, 0.5)" :
    kind === "success" ? "rgba(45, 212, 191, 0.5)" :
    "rgba(255, 255, 255, 0.14)";
}

function fmtDate(dateStr) {
  if (!dateStr) return "-";
  return String(dateStr).slice(0, 10);
}

function badgeStyle(status) {
  if (status === "cancelled") return "border-color: rgba(251,113,133,0.45); color: rgba(251,113,133,0.95);";
  if (status === "confirmed") return "border-color: rgba(45,212,191,0.45); color: rgba(45,212,191,0.95);";
  if (status === "pending") return "border-color: rgba(124,92,255,0.5); color: rgba(200,190,255,0.95);";
  return "";
}

function actions(res) {
  const isCancelled = res.status === "cancelled";
  const isConfirmed = res.status === "confirmed";

  if (isCancelled) {
    return `<button class="btn" disabled>Cancelled</button>`;
  }

  return `
    ${isConfirmed
      ? `<button class="btn" disabled>Confirmed</button>`
      : `<button class="btn btn-primary" data-confirm="${res.id}">Confirm</button>`
    }
    <button class="btn" data-cancel="${res.id}">Cancel</button>
  `;
}

function card(res) {
  return `
    <article class="card">
      <div class="card-body">
        <div class="card-title">
          <h3>#${res.id} - Room ${res.room_number ?? res.room_id ?? "-"}</h3>
          <span class="badge" style="${badgeStyle(res.status)}">${res.status}</span>
        </div>

        <div class="meta mt-12">
          <span>${fmtDate(res.check_in)} -> ${fmtDate(res.check_out)}</span>
          <span>${res.guest_name}</span>
          <span>${res.guest_phone}</span>
        </div>

        <div class="card-actions">
          ${actions(res)}
        </div>
      </div>
    </article>
  `;
}

function normalize(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.reservations && Array.isArray(payload.reservations)) return payload.reservations;
  return [];
}

async function loadReservations() {
  metaText.textContent = "Loading...";
  list.innerHTML = "";

  try {
    const params = new URLSearchParams();
    if (statusFilter.value) params.set("status", statusFilter.value);
    if (fromFilter.value) params.set("from", fromFilter.value);
    if (toFilter.value) params.set("to", toFilter.value);

    const qs = params.toString();
    const data = await apiGet(`/admin/reservations${qs ? `?${qs}` : ""}`);
    const items = normalize(data);

    list.innerHTML = items.map(card).join("");
    metaText.textContent = `${items.length} reservation(s)`;
  } catch (err) {
    showStatus(err.message, "error");
    metaText.textContent = "Failed";
  }
}

list.addEventListener("click", async (e) => {
  const confirmBtn = e.target.closest("button[data-confirm]");
  const cancelBtn = e.target.closest("button[data-cancel]");

  if (confirmBtn) {
    const id = confirmBtn.dataset.confirm;
    if (!confirm(`Confirm reservation #${id}?`)) return;
    await apiPut(`/admin/reservations/${id}`, { status: "confirmed" });
    showStatus(`Reservation #${id} confirmed`, "success");
    loadReservations();
  }

  if (cancelBtn) {
    const id = cancelBtn.dataset.cancel;
    if (!confirm(`Cancel reservation #${id}?`)) return;
    await apiPatch(`/admin/reservations/${id}/cancel`);
    showStatus(`Reservation #${id} cancelled`, "success");
    loadReservations();
  }
});

btnApply.addEventListener("click", loadReservations);
btnClear.addEventListener("click", () => {
  statusFilter.value = "";
  fromFilter.value = "";
  toFilter.value = "";
  loadReservations();
});

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("admin_token");
  window.location.href = "./login.html";
});

loadReservations();



