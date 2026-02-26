const roomsGrid = document.getElementById("roomsGrid");
const resultMeta = document.getElementById("resultMeta");
const statusBox = document.getElementById("statusBox");

const typeSelect = document.getElementById("type");
const checkInInput = document.getElementById("checkIn");
const checkOutInput = document.getElementById("checkOut");
const btnSearch = document.getElementById("btnSearch");
const btnShowAll = document.getElementById("btnShowAll");
const modalBackdrop = document.getElementById("modalBackdrop");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnCancelModal = document.getElementById("btnCancelModal");
const btnConfirmBooking = document.getElementById("btnConfirmBooking");
const selectedRoomText = document.getElementById("selectedRoomText");
const selectedRoomIdInput = document.getElementById("selectedRoomId");
const modalStatus = document.getElementById("modalStatus");

const guestNameInput = document.getElementById("guestName");
const guestPhoneInput = document.getElementById("guestPhone");
const guestEmailInput = document.getElementById("guestEmail");
const adultsInput = document.getElementById("adults");
const childrenInput = document.getElementById("children");
const modalCheckIn = document.getElementById("modalCheckIn");
const modalCheckOut = document.getElementById("modalCheckOut");

let currentMode = "all";
let lastAvailabilityParams = null;

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

function showModalStatus(message, kind = "info") {
  modalStatus.style.display = "block";
  modalStatus.textContent = message;

  modalStatus.style.borderColor =
    kind === "error" ? "rgba(251, 113, 133, 0.5)" :
    kind === "success" ? "rgba(45, 212, 191, 0.5)" :
    "rgba(255, 255, 255, 0.14)";
}

function hideModalStatus() {
  modalStatus.style.display = "none";
  modalStatus.textContent = "";
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0 });
}

function openModal() {
  document.body.classList.add("modal-open");
}

function closeModal() {
  document.body.classList.remove("modal-open");
  hideModalStatus();
}

function roomCard(room) {
  const isMaintenance = room.status === "maintenance";

  const bookButton = isMaintenance
    ? `<button class="btn" type="button" disabled>Not available</button>`
    : `<button class="btn btn-primary" type="button" data-book='${JSON.stringify({
        id: room.id,
        room_number: room.room_number,
        type: room.type,
        price_per_night: room.price_per_night
      }).replace(/'/g, "&apos;")}'>Book</button>`;

  return `
    <article class="card">
      <div class="card-body">
        <div class="card-title">
          <h3>Room ${room.room_number}</h3>
          <span class="badge" style="${isMaintenance ? "border-color: rgba(251,113,133,0.45); color: rgba(251,113,133,0.95);" : ""}">
            ${isMaintenance ? "Maintenance" : room.type}
          </span>
        </div>

        <div class="price">TZS ${formatMoney(room.price_per_night)} <span class="small">/ night</span></div>

        <div class="meta">
          <span>Capacity: ${room.capacity}</span>
          <span>Type: ${room.type}</span>
        </div>

        <p class="p mt-10">
          ${room.description ? room.description : "-"}
        </p>

        <div class="card-actions">
          ${bookButton}
        </div>

        <div class="small mt-10 text-muted-soft">
          ${isMaintenance ? "Not bookable right now." : "Bookable depending on dates."}
        </div>
      </div>
    </article>
  `;
}

function renderRooms(rooms) {
  roomsGrid.innerHTML = rooms.map(roomCard).join("");
  resultMeta.textContent = `${rooms.length} room(s) shown`;
}

async function loadAllRooms() {
  hideStatus();
  resultMeta.textContent = "Loading rooms...";
  roomsGrid.innerHTML = "";

  try {
    const type = typeSelect.value.trim();
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    const data = await apiGet(`/rooms${query}`);
    renderRooms(data.rooms || []);
    showStatus("Showing all rooms. Use dates to check availability.", "success");
    currentMode = "all";
    lastAvailabilityParams = null;
  } catch (err) {
    showStatus(err.message, "error");
    resultMeta.textContent = "Failed to load rooms";
  }
}

async function searchAvailableRooms() {
  hideStatus();

  const type = typeSelect.value.trim();
  const checkIn = checkInInput.value;
  const checkOut = checkOutInput.value;

  if (!checkIn || !checkOut) {
    showStatus("Please select both check-in and check-out dates.", "error");
    return;
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    showStatus("Check-out must be after check-in.", "error");
    return;
  }

  resultMeta.textContent = "Checking availability...";
  roomsGrid.innerHTML = "";

  try {
    const params = new URLSearchParams();
    params.set("check_in", checkIn);
    params.set("check_out", checkOut);
    if (type) params.set("type", type);

    const data = await apiGet(`/rooms/available?${params.toString()}`);
    renderRooms(data.rooms || []);

    if ((data.rooms || []).length === 0) {
      showStatus("No rooms available for those dates. Try different dates or type.", "error");
    } else {
      showStatus("These rooms are available for your dates.", "success");
    }

    currentMode = "available";
    lastAvailabilityParams = params.toString();
  } catch (err) {
    showStatus(err.message, "error");
    resultMeta.textContent = "Availability check failed";
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setDefaultModalDates() {
  if (checkInInput.value) modalCheckIn.value = checkInInput.value;
  if (checkOutInput.value) modalCheckOut.value = checkOutInput.value;
  if (!modalCheckIn.value) modalCheckIn.value = todayISO();
}

roomsGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-book]");
  if (!btn) return;

  const room = JSON.parse(btn.dataset.book);

  selectedRoomIdInput.value = room.id;
  selectedRoomText.textContent = `Room ${room.room_number} - ${room.type} - TZS ${formatMoney(room.price_per_night)}/night`;

  setDefaultModalDates();

  guestNameInput.value = "";
  guestPhoneInput.value = "";
  guestEmailInput.value = "";
  adultsInput.value = "1";
  childrenInput.value = "0";
  hideModalStatus();

  openModal();
});

btnCloseModal.addEventListener("click", closeModal);
btnCancelModal.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

btnConfirmBooking.addEventListener("click", async () => {
  hideModalStatus();

  const room_id = Number(selectedRoomIdInput.value);
  const guest_name = guestNameInput.value.trim();
  const guest_phone = guestPhoneInput.value.trim();
  const guest_email = guestEmailInput.value.trim() || null;
  const check_in = modalCheckIn.value;
  const check_out = modalCheckOut.value;
  const adults = Number(adultsInput.value);
  const children = Number(childrenInput.value);

  if (!room_id) return showModalStatus("No room selected.", "error");
  if (!guest_name || !guest_phone) return showModalStatus("Guest name and phone are required.", "error");
  if (!check_in || !check_out) return showModalStatus("Please select check-in and check-out dates.", "error");
  if (new Date(check_out) <= new Date(check_in)) return showModalStatus("Check-out must be after check-in.", "error");
  if (!Number.isInteger(adults) || adults < 1) return showModalStatus("Adults must be at least 1.", "error");
  if (!Number.isInteger(children) || children < 0) return showModalStatus("Children cannot be negative.", "error");

  btnConfirmBooking.disabled = true;
  btnConfirmBooking.textContent = "Booking...";

  try {
    await apiPost("/reservations", {
      room_id,
      guest_name,
      guest_phone,
      guest_email,
      check_in,
      check_out,
      adults,
      children
    });

    showModalStatus("Booking successful! Your reservation is pending.", "success");

    setTimeout(async () => {
      closeModal();

      if (currentMode === "available" && lastAvailabilityParams) {
        const data = await apiGet(`/rooms/available?${lastAvailabilityParams}`);
        renderRooms(data.rooms || []);
        showStatus("Updated availability after booking.", "success");
      } else {
        await loadAllRooms();
      }
    }, 700);
  } catch (err) {
    showModalStatus(err.message, "error");
  } finally {
    btnConfirmBooking.disabled = false;
    btnConfirmBooking.textContent = "Confirm Booking";
  }
});

btnSearch.addEventListener("click", searchAvailableRooms);
btnShowAll.addEventListener("click", loadAllRooms);
typeSelect.addEventListener("change", loadAllRooms);

loadAllRooms();





