#!/usr/bin/env node
'use strict';

// Load environment variables if .env exists
try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional, continue without it
  console.log('dotenv not available, using system environment variables');
}

const express = require('express');
const { 
  jsonParser, 
  corsMiddleware, 
  staticMiddleware
} = require('./middleware');
const { attachUserInfo } = require('./middleware/auth');
const { errorHandler, methodNotAllowed, notFound } = require('./lib/errors');

const app = express();
const port = process.argv[2] || 3000;

// Ensure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

// Middleware
app.use(corsMiddleware);
app.use(jsonParser);
app.use('/uploads', staticMiddleware);
app.use(attachUserInfo);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/transactions', require('./routes/transactions'));
app.use('/events', require('./routes/events'));
app.use('/promotions', require('./routes/promotions'));
app.use('/test', require('./routes/test'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'A2 Loyalty API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth',
      test: '/test'
    }
  });
});

// Handle 404 routes
app.use(notFound);

// Handle unsupported methods
app.use(methodNotAllowed);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`JWT_SECRET configured: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /auth/tokens - User login`);
  console.log(`  GET  /auth/me - Get self profile`);
  console.log(`  PATCH /auth/me - Update self profile`);
  console.log(`  PATCH /auth/me/password - Change password`);
  console.log(`  POST /auth/register - Register user (cashiers+)`);
  console.log(`  GET  /auth/users - Filter users (cashiers+)`);
  console.log(`  PUT  /auth/users/:id - Update user (managers+)`);
  console.log(`  POST /auth/resets - Request reset token`);
  console.log(`  POST /auth/resets/:token - Activate/reset with token`);
  console.log(`  GET  /auth/profile - Get user profile (protected)`);
  console.log(`  POST /transactions - Create transaction`);
  console.log(`  GET  /transactions/:id - Get transaction`);
  console.log(`  GET  /transactions/users/:userId - Get user transactions`);
  console.log(`  POST /transactions/:id/suspicious - Flag as suspicious (managers)`);
  console.log(`  POST /transactions/:id/processed - Process transaction (cashiers)`);
  console.log(`  POST /events - Create event`);
  console.log(`  GET  /events - Get events with filtering`);
  console.log(`  GET  /events/:id - Get event by ID`);
  console.log(`  PATCH /events/:id - Update event (organizers)`);
  console.log(`  POST /events/:id/organizers/:userId - Add organizer (managers)`);
  console.log(`  DELETE /events/:id/organizers/:userId - Remove organizer (managers)`);
  console.log(`  POST /events/:id/guests/:userId - Add guest`);
  console.log(`  DELETE /events/:id/guests/:userId - Remove guest`);
  console.log(`  POST /events/:id/guests/me - Self RSVP`);
  console.log(`  GET  /events/:id/transactions - Get event transactions`);
  console.log(`  POST /events/:id/award-points - Award points (organizers)`);
  console.log(`  GET  /test/* - Test authorization endpoints`);
});

module.exports = app;