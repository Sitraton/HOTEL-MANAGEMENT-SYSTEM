const pool = require("../db/db");
function isValidDateString(dateStr) {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
}

function isPositiveInt(n) {
  return Number.isInteger(Number(n)) && Number(n) > 0;
}

function isNonNegativeInt(n) {
  return Number.isInteger(Number(n)) && Number(n) >= 0;
}

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "checked_in", "checked_out"];
async function roomHasOverlap({ roomId, checkIn, checkOut, excludeReservationId = null }) {
  let sql = `
    SELECT id
    FROM reservations
    WHERE room_id = ?
      AND status <> 'cancelled'
      AND ? < check_out
      AND ? > check_in
  `;
  const params = [roomId, checkIn, checkOut];

  if (excludeReservationId) {
    sql += ` AND id <> ?`;
    params.push(excludeReservationId);
  }

  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}
exports.getAllReservations = async (req, res) => {
  try {
    const { status, from, to, room_id } = req.query;

    let sql = `
      SELECT res.*, r.room_number, r.type, r.price_per_night
      FROM reservations res
      JOIN rooms r ON r.id = res.room_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND res.status = ?`;
      params.push(status);
    }

    if (room_id) {
      sql += ` AND res.room_id = ?`;
      params.push(Number(room_id));
    }
    if (from) {
      if (!isValidDateString(from)) {
        return res.status(400).json({ message: "Invalid 'from' date. Use YYYY-MM-DD." });
      }
      sql += ` AND res.check_in >= ?`;
      params.push(from);
    }

    if (to) {
      if (!isValidDateString(to)) {
        return res.status(400).json({ message: "Invalid 'to' date. Use YYYY-MM-DD." });
      }
      sql += ` AND res.check_out <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY res.created_at DESC`;

    const [rows] = await pool.query(sql, params);
    res.json({ count: rows.length, reservations: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reservations", error: error.message });
  }
};
exports.getReservationById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid reservation id" });
    }

    const [rows] = await pool.query(
      `
      SELECT res.*, r.room_number, r.type, r.price_per_night
      FROM reservations res
      JOIN rooms r ON r.id = res.room_id
      WHERE res.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reservation", error: error.message });
  }
};
exports.createReservation = async (req, res) => {
  try {
    const {
      room_id,
      guest_name,
      guest_phone,
      guest_email = null,
      check_in,
      check_out,
      adults = 1,
      children = 0
    } = req.body;
    if (!room_id || !guest_name || !guest_phone || !check_in || !check_out) {
      return res.status(400).json({
        message: "room_id, guest_name, guest_phone, check_in, check_out are required"
      });
    }

    if (!Number.isInteger(Number(room_id))) {
      return res.status(400).json({ message: "room_id must be an integer" });
    }

    if (!isValidDateString(check_in) || !isValidDateString(check_out)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const inDate = new Date(check_in);
    const outDate = new Date(check_out);
    if (outDate <= inDate) {
      return res.status(400).json({ message: "check_out must be after check_in" });
    }

    if (!isPositiveInt(adults)) {
      return res.status(400).json({ message: "adults must be a positive integer" });
    }
    if (!isNonNegativeInt(children)) {
      return res.status(400).json({ message: "children must be a non-negative integer" });
    }
    const [roomRows] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [Number(room_id)]);
    if (roomRows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (roomRows[0].status !== "available") {
      return res.status(409).json({ message: "Room is not available (maintenance)" });
    }
    const hasOverlap = await roomHasOverlap({
      roomId: Number(room_id),
      checkIn: check_in,
      checkOut: check_out
    });

    if (hasOverlap) {
      return res.status(409).json({
        message: "Room is already booked for the selected dates"
      });
    }
    const [result] = await pool.query(
      `
      INSERT INTO reservations
        (room_id, guest_name, guest_phone, guest_email, check_in, check_out, adults, children, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        Number(room_id),
        guest_name,
        guest_phone,
        guest_email,
        check_in,
        check_out,
        Number(adults),
        Number(children)
      ]
    );
    const [created] = await pool.query(
      `
      SELECT res.*, r.room_number, r.type, r.price_per_night
      FROM reservations res
      JOIN rooms r ON r.id = res.room_id
      WHERE res.id = ?
      `,
      [result.insertId]
    );

    res.status(201).json({ message: "Reservation created", reservation: created[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to create reservation", error: error.message });
  }
};
exports.updateReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid reservation id" });
    }
    const [existingRows] = await pool.query(`SELECT * FROM reservations WHERE id = ?`, [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const existing = existingRows[0];
    const {
      room_id,
      guest_name,
      guest_phone,
      guest_email,
      check_in,
      check_out,
      adults,
      children,
      status
    } = req.body;
    const fields = [];
    const params = [];
    let newRoomId = existing.room_id;
    let newCheckIn = existing.check_in;
    let newCheckOut = existing.check_out;

    if (room_id !== undefined) {
      if (!Number.isInteger(Number(room_id))) {
        return res.status(400).json({ message: "room_id must be an integer" });
      }
      newRoomId = Number(room_id);
      fields.push("room_id = ?");
      params.push(newRoomId);
    }

    if (guest_name !== undefined) {
      fields.push("guest_name = ?");
      params.push(guest_name);
    }

    if (guest_phone !== undefined) {
      fields.push("guest_phone = ?");
      params.push(guest_phone);
    }

    if (guest_email !== undefined) {
      fields.push("guest_email = ?");
      params.push(guest_email);
    }

    if (check_in !== undefined) {
      if (!isValidDateString(check_in)) {
        return res.status(400).json({ message: "Invalid check_in date. Use YYYY-MM-DD." });
      }
      newCheckIn = check_in;
      fields.push("check_in = ?");
      params.push(newCheckIn);
    }

    if (check_out !== undefined) {
      if (!isValidDateString(check_out)) {
        return res.status(400).json({ message: "Invalid check_out date. Use YYYY-MM-DD." });
      }
      newCheckOut = check_out;
      fields.push("check_out = ?");
      params.push(newCheckOut);
    }
    const inDate = new Date(newCheckIn);
    const outDate = new Date(newCheckOut);
    if (outDate <= inDate) {
      return res.status(400).json({ message: "check_out must be after check_in" });
    }

    if (adults !== undefined) {
      if (!isPositiveInt(adults)) {
        return res.status(400).json({ message: "adults must be a positive integer" });
      }
      fields.push("adults = ?");
      params.push(Number(adults));
    }

    if (children !== undefined) {
      if (!isNonNegativeInt(children)) {
        return res.status(400).json({ message: "children must be a non-negative integer" });
      }
      fields.push("children = ?");
      params.push(Number(children));
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Use: ${VALID_STATUSES.join(", ")}` });
      }
      fields.push("status = ?");
      params.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }
    const willBeCancelled = status === "cancelled";
    const changingRoomOrDates =
      room_id !== undefined || check_in !== undefined || check_out !== undefined;

    if (!willBeCancelled && changingRoomOrDates) {
      const [roomRows] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [newRoomId]);
      if (roomRows.length === 0) {
        return res.status(404).json({ message: "Room not found" });
      }
      if (roomRows[0].status !== "available") {
        return res.status(409).json({ message: "Room is not available (maintenance)" });
      }

      const hasOverlap = await roomHasOverlap({
        roomId: newRoomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        excludeReservationId: id
      });

      if (hasOverlap) {
        return res.status(409).json({ message: "Room is already booked for the selected dates" });
      }
    }
    const sql = `UPDATE reservations SET ${fields.join(", ")} WHERE id = ?`;
    params.push(id);
    await pool.query(sql, params);
    const [updated] = await pool.query(
      `
      SELECT res.*, r.room_number, r.type, r.price_per_night
      FROM reservations res
      JOIN rooms r ON r.id = res.room_id
      WHERE res.id = ?
      `,
      [id]
    );

    res.json({ message: "Reservation updated", reservation: updated[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update reservation", error: error.message });
  }
};
exports.cancelReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid reservation id" });
    }

    const [existingRows] = await pool.query(`SELECT * FROM reservations WHERE id = ?`, [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    await pool.query(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`, [id]);

    const [updated] = await pool.query(
      `
      SELECT res.*, r.room_number, r.type, r.price_per_night
      FROM reservations res
      JOIN rooms r ON r.id = res.room_id
      WHERE res.id = ?
      `,
      [id]
    );

    res.json({ message: "Reservation cancelled", reservation: updated[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel reservation", error: error.message });
  }
};
