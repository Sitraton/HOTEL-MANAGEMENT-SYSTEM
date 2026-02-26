const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./src/db/db");

const roomsRoutes = require("./src/routes/roomsRoutes");
const reservationsRoutes = require("./src/routes/reservationsRoutes");
const adminReservationsRoutes = require("./src/routes/adminReservationsRoutes");
const authRoutes = require("./src/routes/authRoutes");
const statsRoutes = require("./src/routes/statsRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hotel API running" });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ status: "ok", db: "connected", test: rows[0].result });
  } catch (error) {
    res.status(500).json({
      status: "error",
      db: "not connected",
      message: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/admin/reservations", adminReservationsRoutes);
app.use("/api/stats", statsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});




