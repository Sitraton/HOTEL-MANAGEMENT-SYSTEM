const homeStatus = document.getElementById("homeStatus");

function showHomeStatus(message, kind = "info") {
  homeStatus.style.display = "block";
  homeStatus.textContent = message;

  homeStatus.style.borderColor =
    kind === "error" ? "rgba(251, 113, 133, 0.5)" :
    kind === "success" ? "rgba(45, 212, 191, 0.5)" :
    "rgba(255, 255, 255, 0.14)";
}

async function loadStats() {
  try {
    const data = await apiGet("/stats");

    document.getElementById("statTotalRooms").textContent = data.total_rooms;
    document.getElementById("statAvailableRooms").textContent = data.available_rooms;
    document.getElementById("statActiveReservations").textContent = data.active_reservations;
    document.getElementById("statPending").textContent = data.pending_reservations;
    document.getElementById("statConfirmed").textContent = data.confirmed_reservations;

    showHomeStatus(`Stats updated from backend at ${new Date().toLocaleTimeString()}.`, "success");
  } catch (err) {
    showHomeStatus(`Stats not loaded: ${err.message}`, "error");
  }
}

loadStats();
setInterval(loadStats, 30000);

