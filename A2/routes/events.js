const express = require('express');
const EventController = require('../controllers/eventController');
const { jwtAuth, requireAny, requireManager } = require('../middleware/auth');

const router = express.Router();

// Event CRUD operations
router.post('/', jwtAuth, requireManager, EventController.createEvent);
router.get('/', jwtAuth, requireAny, EventController.getEvents);
router.get('/:eventId', jwtAuth, requireAny, EventController.getEvent);
router.patch('/:eventId', jwtAuth, requireAny, EventController.updateEvent);
router.delete('/:eventId', jwtAuth, requireManager, EventController.deleteEvent);

// Organizer management
router.post('/:eventId/organizers', jwtAuth, requireManager, EventController.addOrganizer);
router.delete('/:eventId/organizers/:userId', jwtAuth, requireManager, EventController.removeOrganizer);

// Guest management
router.post('/:eventId/guests', jwtAuth, requireAny, EventController.addGuest);
router.delete('/:eventId/guests/:userId', jwtAuth, requireManager, EventController.removeGuest);
router.post('/:eventId/guests/me', jwtAuth, requireAny, EventController.selfRSVP);
router.delete('/:eventId/guests/me', jwtAuth, requireAny, EventController.selfUnRSVP);

// Event transactions and point awarding
router.post('/:eventId/transactions', jwtAuth, requireAny, EventController.awardPoints);

module.exports = router;

