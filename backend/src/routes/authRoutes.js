const express = require("express");
const router = express.Router();

const { loginAdmin, meAdmin } = require("../controllers/authController");
const { requireAdminAuth } = require("../middleware/authMiddleware");

router.post("/login", loginAdmin);
router.get("/me", requireAdminAuth, meAdmin);

module.exports = router;