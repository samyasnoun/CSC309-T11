import express from "express";

import {
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
    createRewardTransaction
} from "../controllers/eventController.js";

import { authenticate, requires } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, requires("manager"), postEvent);

router.get("/", authenticate, getEvents);

router.get("/:eventId", authenticate, getEventById);

router.patch("/:eventId", authenticate, requires("manager"), patchEventById);

router.delete("/:eventId", authenticate, requires("manager"), deleteEventById);

router.post("/:eventId/organizers", authenticate, requires("manager"), postOrganizerToEvent);

router.delete("/:eventId/organizers/:userId", authenticate, requires("manager"), removeOrganizerFromEvent);

router.post("/:eventId/guests", authenticate, requires("manager"), postGuestToEvent);

router.delete("/:eventId/guests/:userId", authenticate, requires("manager"), deleteGuestFromEvent);

router.post("/:eventId/guests/me", authenticate, postCurrentUserToEvent);

router.delete("/:eventId/guests/me", authenticate, removeCurrentUserFromEvent);

router.post("/:eventId/transactions", authenticate, createRewardTransaction);

export default router;
