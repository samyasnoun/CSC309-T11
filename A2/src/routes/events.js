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
router.get("/", authenticate, attachUser, getEvents);
router.get("/:eventId", authenticate, attachUser, getEventById);

// Managers / organizers / superusers can manage event
router.patch("/:eventId", authenticate, canManageEvent(), patchEventById);
router.delete("/:eventId", authenticate, canManageEvent(), deleteEventById);

router.post("/:eventId/organizers", authenticate, canManageEvent(), postOrganizerToEvent);
router.delete("/:eventId/organizers/:userId", authenticate, canManageEvent(), removeOrganizerFromEvent);

router.post("/:eventId/guests", authenticate, canManageEvent(), postGuestToEvent);
router.delete("/:eventId/guests/:userId", authenticate, canManageEvent(), deleteGuestFromEvent);

// Regular users RSVP to events
router.post("/:eventId/guests/me", authenticate, attachUser, postCurrentUserToEvent);
router.delete("/:eventId/guests/me", authenticate, attachUser, removeCurrentUserFromEvent);

// Award points after events
router.post("/:eventId/transactions", authenticate, canManageEvent(), createRewardTransaction);

module.exports = router;
