const express = require("express");
const router = express.Router();

const reservationsController = require("../controllers/reservationsController");
const { requireAdminAuth } = require("../middleware/authMiddleware");
const getReservations =
  reservationsController.getReservations ||
  reservationsController.getAllReservations ||
  reservationsController.listReservations;

const updateReservation =
  reservationsController.updateReservation ||
  reservationsController.update ||
  reservationsController.updateReservationStatus;

const cancelReservation =
  reservationsController.cancelReservation ||
  reservationsController.cancel ||
  reservationsController.cancelBooking;

function mustBeFn(fn, name) {
  if (typeof fn !== "function") {
    throw new Error(`reservationsController.${name} is missing in reservationsController.js`);
  }
}

mustBeFn(getReservations, "getReservations");
mustBeFn(updateReservation, "updateReservation");
mustBeFn(cancelReservation, "cancelReservation");
router.get("/", requireAdminAuth, getReservations);
router.put("/:id", requireAdminAuth, updateReservation);
router.patch("/:id/cancel", requireAdminAuth, cancelReservation);

module.exports = router;

