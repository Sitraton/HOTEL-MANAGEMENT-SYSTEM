require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/db/db");

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO admins (email, password_hash) VALUES (?, ?)",
      [email, hash]
    );
    console.log("Admin created:", email);
  } catch (err) {
    console.log("Failed:", err.message);
  } finally {
    process.exit(0);
  }
}

run();


