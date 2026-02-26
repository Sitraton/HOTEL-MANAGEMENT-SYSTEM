const pool = require("../db/db");
function isPositiveNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}
function isValidDateString(dateStr) {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
}
exports.getAllRooms = async (req, res) => {
  try {
    const { type, minPrice, maxPrice, capacity, status } = req.query;

    let sql = `SELECT * FROM rooms WHERE 1=1`;
    const params = [];

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (capacity) {
      sql += ` AND capacity >= ?`;
      params.push(Number(capacity));
    }

    if (minPrice) {
      sql += ` AND price_per_night >= ?`;
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      sql += ` AND price_per_night <= ?`;
      params.push(Number(maxPrice));
    }

    sql += ` ORDER BY room_number ASC`;

    const [rows] = await pool.query(sql, params);
    res.json({ count: rows.length, rooms: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms", error: error.message });
  }
};
exports.getAvailableRooms = async (req, res) => {
  try {
    const { check_in, check_out, type } = req.query;
    if (!check_in || !check_out) {
      return res.status(400).json({
        message: "check_in and check_out are required (YYYY-MM-DD)"
      });
    }

    if (!isValidDateString(check_in) || !isValidDateString(check_out)) {
      return res.status(400).json({
        message: "Invalid date format. Use YYYY-MM-DD."
      });
    }
    const inDate = new Date(check_in);
    const outDate = new Date(check_out);
    if (outDate <= inDate) {
      return res.status(400).json({
        message: "check_out must be after check_in"
      });
    }
    let sql = `
      SELECT r.*
      FROM rooms r
      WHERE r.status = 'available'
        AND NOT EXISTS (
          SELECT 1
          FROM reservations res
          WHERE res.room_id = r.id
            AND res.status <> 'cancelled'
            AND DATE(?) < res.check_out
            AND DATE(?) > res.check_in
        )
    `;

    const params = [check_in, check_out];

    if (type) {
      sql += ` AND r.type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY r.room_number ASC`;

    const [rows] = await pool.query(sql, params);
    res.json({ count: rows.length, rooms: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch available rooms", error: error.message });
  }
};
exports.getRoomById = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const [rows] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [roomId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch room", error: error.message });
  }
};
exports.createRoom = async (req, res) => {
  try {
    const {
      room_number,
      type,
      price_per_night,
      capacity,
      status = "available",
      description = "",
      image_url = ""
    } = req.body;

    if (!room_number || !type) {
      return res.status(400).json({ message: "room_number and type are required" });
    }
    if (!isPositiveNumber(price_per_night)) {
      return res.status(400).json({ message: "price_per_night must be a positive number" });
    }
    if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
      return res.status(400).json({ message: "capacity must be a positive integer" });
    }
    if (!["available", "maintenance"].includes(status)) {
      return res.status(400).json({ message: "status must be 'available' or 'maintenance'" });
    }

    const sql = `
      INSERT INTO rooms (room_number, type, price_per_night, capacity, status, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      room_number,
      type,
      Number(price_per_night),
      Number(capacity),
      status,
      description,
      image_url
    ];

    const [result] = await pool.query(sql, params);
    const [created] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [result.insertId]);

    res.status(201).json({ message: "Room created", room: created[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "room_number already exists" });
    }
    res.status(500).json({ message: "Failed to create room", error: error.message });
  }
};
exports.updateRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const { room_number, type, price_per_night, capacity, status, description, image_url } = req.body;

    const [existing] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [roomId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (price_per_night !== undefined && !isPositiveNumber(price_per_night)) {
      return res.status(400).json({ message: "price_per_night must be a positive number" });
    }
    if (capacity !== undefined) {
      if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
        return res.status(400).json({ message: "capacity must be a positive integer" });
      }
    }
    if (status !== undefined && !["available", "maintenance"].includes(status)) {
      return res.status(400).json({ message: "status must be 'available' or 'maintenance'" });
    }

    const fields = [];
    const params = [];

    if (room_number !== undefined) { fields.push("room_number = ?"); params.push(room_number); }
    if (type !== undefined) { fields.push("type = ?"); params.push(type); }
    if (price_per_night !== undefined) { fields.push("price_per_night = ?"); params.push(Number(price_per_night)); }
    if (capacity !== undefined) { fields.push("capacity = ?"); params.push(Number(capacity)); }
    if (status !== undefined) { fields.push("status = ?"); params.push(status); }
    if (description !== undefined) { fields.push("description = ?"); params.push(description); }
    if (image_url !== undefined) { fields.push("image_url = ?"); params.push(image_url); }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    const sql = `UPDATE rooms SET ${fields.join(", ")} WHERE id = ?`;
    params.push(roomId);

    await pool.query(sql, params);

    const [updated] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [roomId]);
    res.json({ message: "Room updated", room: updated[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "room_number already exists" });
    }
    res.status(500).json({ message: "Failed to update room", error: error.message });
  }
};
exports.deleteRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const [existing] = await pool.query(`SELECT id FROM rooms WHERE id = ?`, [roomId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    await pool.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);
    res.json({ message: "Room deleted" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Cannot delete room because it has reservations. Cancel/delete reservations first."
      });
    }
    res.status(500).json({ message: "Failed to delete room", error: error.message });
  }
};
