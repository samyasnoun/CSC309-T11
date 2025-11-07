// routes/events.js

const express = require("express");
const {
  postEvent,
  getEvents,
  getEventById,
  patchEventById,
  deleteEventById,
  postOrganizerToEvent,
  removeOrganizerFromEvent,
  postGuestToEvent,
  deleteGuestFromEvent,
  postCurrentUserToEvent,
  removeCurrentUserFromEvent,
  createRewardTransaction,
} = require("../controllers/eventController.js");
const { authenticate, requires, attachUser } = require("../middleware/authMiddleware");
const { canManageEvent } = require("../middleware/eventAccess");

const router = express.Router();

// Managers or superusers can create events
router.post("/", authenticate, requires("manager"), postEvent);

// All authenticated users can view events
router.get("/", authenticate, requires("regular"), getEvents);
router.get("/:eventId", authenticate, requires("regular"), getEventById);

// Managers / organizers / superusers can manage event
router.patch("/:eventId", authenticate, requires("regular"), canManageEvent(), patchEventById);
router.delete("/:eventId", authenticate, requires("regular"), canManageEvent(), deleteEventById);

router.post("/:eventId/organizers", authenticate, requires("regular"), canManageEvent(), postOrganizerToEvent);
router.delete("/:eventId/organizers/:userId", authenticate, requires("regular"), canManageEvent(), removeOrganizerFromEvent);

router.post("/:eventId/guests", authenticate, requires("regular"), canManageEvent(), postGuestToEvent);
router.delete("/:eventId/guests/:userId", authenticate, requires("manager"), deleteGuestFromEvent);

// Regular users RSVP to events
router.post("/:eventId/guests/me", authenticate, requires("regular"), postCurrentUserToEvent);
router.delete("/:eventId/guests/me", authenticate, requires("regular"), removeCurrentUserFromEvent);

// Award points after events
router.post("/:eventId/transactions", authenticate, requires("regular"), canManageEvent(), createRewardTransaction);

module.exports = router;
