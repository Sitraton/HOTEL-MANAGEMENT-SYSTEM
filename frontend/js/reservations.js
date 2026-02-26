const statusSelect = document.getElementById("status");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const btnApply = document.getElementById("btnApply");
const btnClear = document.getElementById("btnClear");

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

function hideStatus() {
  statusBox.style.display = "none";
  statusBox.textContent = "";
}

function fmtDate(dateStr) {
  if (!dateStr) return "-";
  return String(dateStr).slice(0, 10);
}

function badgeStyle(status) {
  if (status === "cancelled") return "border-color: rgba(251,113,133,0.45); color: rgba(251,113,133,0.95);";
  if (status === "confirmed") return "border-color: rgba(45,212,191,0.45); color: rgba(45,212,191,0.95);";
  return "";
}

function card(res) {
  const canCancel = res.status !== "cancelled";

  return `
    <article class="card">
      <div class="card-body">
        <div class="card-title">
          <h3>#${res.id} - Room ${res.room_number}</h3>
          <span class="badge" style="${badgeStyle(res.status)}">${res.status}</span>
        </div>

        <div class="meta mt-12">
          <span>${fmtDate(res.check_in)} -> ${fmtDate(res.check_out)}</span>
          <span>${res.type}</span>
          <span>TZS ${Number(res.price_per_night).toLocaleString()} / night</span>
        </div>

        <p class="p mt-10">
          <strong>${res.guest_name}</strong> - ${res.guest_phone}
          ${res.guest_email ? ` - ${res.guest_email}` : ""}
        </p>

        <div class="card-actions">
          ${
            canCancel
              ? `<button class="btn" type="button" data-cancel="${res.id}">Cancel</button>`
              : `<button class="btn" type="button" disabled>Cancelled</button>`
          }
        </div>
      </div>
    </article>
  `;
}

async function loadReservations() {
  hideStatus();
  metaText.textContent = "Loading...";
  list.innerHTML = "";

  try {
    const params = new URLSearchParams();
    if (statusSelect.value) params.set("status", statusSelect.value);
    if (fromInput.value) params.set("from", fromInput.value);
    if (toInput.value) params.set("to", toInput.value);

    const qs = params.toString();
    const data = await apiGet(`/reservations${qs ? `?${qs}` : ""}`);

    const items = data.reservations || [];
    list.innerHTML = items.map(card).join("");
    metaText.textContent = `${items.length} reservation(s)`;
    if (items.length === 0) showStatus("No reservations found for the selected filters.", "info");
  } catch (err) {
    showStatus(err.message, "error");
    metaText.textContent = "Failed to load reservations";
  }
}

list.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-cancel]");
  if (!btn) return;

  const id = btn.dataset.cancel;

  const ok = confirm(`Cancel reservation #${id}?`);
  if (!ok) return;

  btn.disabled = true;
  btn.textContent = "Cancelling...";

  try {
    await apiPatch(`/reservations/${id}/cancel`);
    showStatus(`Reservation #${id} cancelled.`, "success");
    await loadReservations();
  } catch (err) {
    showStatus(err.message, "error");
  }
});

btnApply.addEventListener("click", loadReservations);
btnClear.addEventListener("click", () => {
  statusSelect.value = "";
  fromInput.value = "";
  toInput.value = "";
  loadReservations();
});

loadReservations();



