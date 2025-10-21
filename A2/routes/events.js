const express = require('express');
const EventController = require('../controllers/eventController');
const { jwtAuth, requireAny, requireManager } = require('../middleware/auth');

const router = express.Router();

// Event CRUD operations
router.post('/', jwtAuth, requireAny, EventController.createEvent);
router.get('/', jwtAuth, requireAny, EventController.getEvents);
router.get('/:eventId', jwtAuth, requireAny, EventController.getEvent);
router.patch('/:eventId', jwtAuth, requireAny, EventController.updateEvent);

// Organizer management (Manager only)
router.post('/:eventId/organizers/:userId', jwtAuth, requireManager, EventController.addOrganizer);
router.delete('/:eventId/organizers/:userId', jwtAuth, requireManager, EventController.removeOrganizer);

// Guest management (RSVP)
router.post('/:eventId/guests/:userId', jwtAuth, requireAny, EventController.addGuest);
router.delete('/:eventId/guests/:userId', jwtAuth, requireAny, EventController.removeGuest);
router.post('/:eventId/guests/me', jwtAuth, requireAny, EventController.selfRSVP);

// Event transactions and point awarding
router.get('/:eventId/transactions', jwtAuth, requireAny, EventController.getEventTransactions);
router.post('/:eventId/award-points', jwtAuth, requireAny, EventController.awardPoints);

module.exports = router;

