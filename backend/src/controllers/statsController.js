const pool = require("../db/db");

exports.getStats = async (req, res) => {
  try {
    const [[roomsTotal]] = await pool.query(`SELECT COUNT(*) AS total_rooms FROM rooms`);
    const [[roomsAvailable]] = await pool.query(
      `SELECT COUNT(*) AS available_rooms FROM rooms WHERE status = 'available'`
    );
    const [[activeReservations]] = await pool.query(
      `SELECT COUNT(*) AS active_reservations
       FROM reservations
       WHERE status <> 'cancelled' AND status <> 'checked_out'`
    );
    const [[pendingReservations]] = await pool.query(
      `SELECT COUNT(*) AS pending_reservations FROM reservations WHERE status = 'pending'`
    );

    const [[confirmedReservations]] = await pool.query(
      `SELECT COUNT(*) AS confirmed_reservations FROM reservations WHERE status = 'confirmed'`
    );

    res.json({
      total_rooms: roomsTotal.total_rooms,
      available_rooms: roomsAvailable.available_rooms,
      active_reservations: activeReservations.active_reservations,
      pending_reservations: pendingReservations.pending_reservations,
      confirmed_reservations: confirmedReservations.confirmed_reservations
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
};
