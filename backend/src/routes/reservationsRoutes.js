const express = require("express");
const router = express.Router();

const reservationsController = require("../controllers/reservationsController");

const createReservation =
  reservationsController.createReservation ||
  reservationsController.create ||
  reservationsController.addReservation;
const getAllReservations = reservationsController.getAllReservations;
const getReservationById = reservationsController.getReservationById;
const cancelReservation = reservationsController.cancelReservation;

if (typeof createReservation !== "function") {
  throw new Error("reservationsController.createReservation is missing in reservationsController.js");
}
if (typeof getAllReservations !== "function") {
  throw new Error("reservationsController.getAllReservations is missing in reservationsController.js");
}
if (typeof getReservationById !== "function") {
  throw new Error("reservationsController.getReservationById is missing in reservationsController.js");
}
if (typeof cancelReservation !== "function") {
  throw new Error("reservationsController.cancelReservation is missing in reservationsController.js");
}
router.get("/", getAllReservations);
router.get("/:id", getReservationById);
router.patch("/:id/cancel", cancelReservation);
router.post("/", createReservation);

module.exports = router;

