const AuthService = require('../services/authService');

class EventController {
  // Create event
  static async createEvent(req, res, next) {
    try {
      const { name, description, location, startAt, endAt, capacity, pointsBudget } = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate required fields
      if (!name || !startAt || !endAt || !capacity || !pointsBudget) {
        return res.status(400).json({ error: 'Name, start date, end date, capacity, and points budget are required' });
      }
      
      // Create event
      const event = await AuthService.createEvent({
        name,
        description,
        location,
        startAt,
        endAt,
        capacity,
        pointsBudget
      }, requestingUser);
      
      res.status(201).json({
        message: 'Event created successfully',
        event
      });
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('cannot be')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Get events with filtering
  static async getEvents(req, res, next) {
    try {
      const {
        name = '',
        location = '',
        startDate = '',
        endDate = '',
        page = 1,
        limit = 10
      } = req.query;
      
      // Get events with filters
      const result = await AuthService.getEvents({
        name,
        location,
        startDate,
        endDate,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      res.json({
        count: result.count,
        events: result.events
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Get event by ID
  static async getEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Get event
      const event = await AuthService.getEvent(parseInt(eventId));
      
      res.json(event);
    } catch (error) {
      // Handle not found
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Add organizer to event (Manager only)
  static async addOrganizer(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Add organizer
      const organizer = await AuthService.addEventOrganizer(
        parseInt(eventId), 
        parseInt(userId), 
        requestingUser
      );
      
      res.status(201).json({
        message: 'Organizer added successfully',
        organizer
      });
    } catch (error) {
      // Handle not found
      if (error.message === 'Event not found' || error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('already') || error.message.includes('cannot be')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Remove organizer from event (Manager only)
  static async removeOrganizer(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Remove organizer
      const result = await AuthService.removeEventOrganizer(
        parseInt(eventId), 
        parseInt(userId), 
        requestingUser
      );
      
      res.json(result);
    } catch (error) {
      // Handle not found
      if (error.message === 'User is not an organizer for this event') {
        return res.status(404).json({ error: error.message });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Update event (Organizer only)
  static async updateEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const updateData = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Update event
      const updatedEvent = await AuthService.updateEvent(
        parseInt(eventId), 
        updateData, 
        requestingUser
      );
      
      res.json(updatedEvent);
    } catch (error) {
      // Handle not found
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('must be') ||
          error.message.includes('Invalid') ||
          error.message.includes('cannot be')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Add guest to event (RSVP management)
  static async addGuest(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Add guest
      const guest = await AuthService.addEventGuest(
        parseInt(eventId), 
        parseInt(userId), 
        requestingUser
      );
      
      res.status(201).json({
        message: 'Guest added successfully',
        guest
      });
    } catch (error) {
      // Handle not found
      if (error.message === 'Event not found' || error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('already') || 
          error.message.includes('cannot be') ||
          error.message.includes('at capacity')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Remove guest from event
  static async removeGuest(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Remove guest
      const result = await AuthService.removeEventGuest(
        parseInt(eventId), 
        parseInt(userId), 
        requestingUser
      );
      
      res.json(result);
    } catch (error) {
      // Handle not found
      if (error.message === 'User is not a guest for this event') {
        return res.status(404).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Self RSVP to event
  static async selfRSVP(req, res, next) {
    try {
      const { eventId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Self RSVP
      const guest = await AuthService.selfRSVP(parseInt(eventId), requestingUser);
      
      res.status(201).json({
        message: 'RSVP successful',
        guest
      });
    } catch (error) {
      // Handle not found
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Handle validation errors
      if (error.message.includes('already') || 
          error.message.includes('cannot be') ||
          error.message.includes('at capacity')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Get event transactions
  static async getEventTransactions(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Get event transactions
      const transactions = await AuthService.getEventTransactions(parseInt(eventId));
      
      res.json({
        count: transactions.length,
        transactions
      });
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Award points to confirmed attendees (Organizer only)
  static async awardPoints(req, res, next) {
    try {
      const { eventId } = req.params;
      const { pointsPerPerson } = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Validate points per person
      if (!pointsPerPerson || pointsPerPerson <= 0) {
        return res.status(400).json({ error: 'Points per person must be positive' });
      }
      
      // Award points
      const result = await AuthService.awardPointsToAttendees(
        parseInt(eventId), 
        pointsPerPerson, 
        requestingUser
      );
      
      res.json(result);
    } catch (error) {
      // Handle not found
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('must be') ||
          error.message.includes('No confirmed') ||
          error.message.includes('Insufficient points')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Delete event
  static async deleteEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Delete event
      await AuthService.deleteEvent(parseInt(eventId), requestingUser);
      
      res.status(204).send();
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message.includes('already been published')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
  
  // Add organizer
  static async addOrganizer(req, res, next) {
    try {
      const { eventId } = req.params;
      const { utorid } = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Validate utorid
      if (!utorid) {
        return res.status(400).json({ error: 'Utorid is required' });
      }
      
      // Add organizer
      const result = await AuthService.addEventOrganizer(
        parseInt(eventId), 
        utorid, 
        requestingUser
      );
      
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message.includes('registered as a guest') || 
          error.message.includes('has ended')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      next(error);
    }
  }
  
  // Remove organizer
  static async removeOrganizer(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Remove organizer
      await AuthService.removeEventOrganizer(
        parseInt(eventId), 
        parseInt(userId), 
        requestingUser
      );
      
      res.status(204).send();
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message === 'Organizer not found') {
        return res.status(404).json({ error: 'Organizer not found' });
      }
      next(error);
    }
  }
  
  // Add guest
  static async addGuest(req, res, next) {
    try {
      const { eventId } = req.params;
      const { utorid } = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Validate utorid
      if (!utorid) {
        return res.status(400).json({ error: 'Utorid is required' });
      }
      
      // Add guest
      const result = await AuthService.addEventGuest(
        parseInt(eventId), 
        utorid, 
        requestingUser
      );
      
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message.includes('registered as an organizer') || 
          error.message.includes('full') || 
          error.message.includes('ended')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      next(error);
    }
  }
  
  // Remove guest
  static async removeGuest(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Remove guest
      await AuthService.removeEventGuest(
        parseInt(eventId), 
        parseInt(userId), 
        requestingUser
      );
      
      res.status(204).send();
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message === 'Guest not found') {
        return res.status(404).json({ error: 'Guest not found' });
      }
      next(error);
    }
  }
  
  // Self RSVP
  static async selfRSVP(req, res, next) {
    try {
      const { eventId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Self RSVP
      const result = await AuthService.selfRSVPEvent(
        parseInt(eventId), 
        requestingUser
      );
      
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message.includes('already on the guest list') || 
          error.message.includes('full') || 
          error.message.includes('ended')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
  
  // Self un-RSVP
  static async selfUnRSVP(req, res, next) {
    try {
      const { eventId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Valid event ID is required' });
      }
      
      // Self un-RSVP
      await AuthService.selfUnRSVPEvent(
        parseInt(eventId), 
        requestingUser
      );
      
      res.status(204).send();
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (error.message.includes('did not RSVP') || 
          error.message.includes('ended')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
}

module.exports = EventController;

