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
const { optionalAuth } = require("../middleware/optionalAuth");
const { canManageEvent } = require("../middleware/eventAccess");

const router = express.Router();

// Public GET endpoints (use optionalAuth to allow unauthenticated + privileged views)
router.get("/", optionalAuth, getEvents);
router.get("/:eventId", optionalAuth, getEventById);

// Managers or superusers can create events
router.post("/", authenticate, attachUser, requires("manager"), postEvent);

// Managers / organizers / superusers can manage event (requires auth)
router.patch("/:eventId", authenticate, attachUser, canManageEvent(), patchEventById);
router.delete("/:eventId", authenticate, attachUser, canManageEvent(), deleteEventById);

router.post("/:eventId/organizers", authenticate, attachUser, canManageEvent(), postOrganizerToEvent);
router.delete("/:eventId/organizers/:userId", authenticate, attachUser, canManageEvent(), removeOrganizerFromEvent);

router.post("/:eventId/guests", authenticate, attachUser, canManageEvent(), postGuestToEvent);
router.delete("/:eventId/guests/:userId", authenticate, attachUser, canManageEvent(), deleteGuestFromEvent);

// Regular users RSVP to events (requires auth)
router.post("/:eventId/guests/me", authenticate, postCurrentUserToEvent);
router.delete("/:eventId/guests/me", authenticate, removeCurrentUserFromEvent);

// Award points after events (requires auth)
router.post("/:eventId/transactions", authenticate, attachUser, canManageEvent(), createRewardTransaction);

module.exports = router;
