const express = require('express');
const cors = require('cors');
const path = require('path');

// JSON body parsing middleware
const jsonParser = express.json({ limit: '10mb' });

// CORS middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
const corsMiddleware = cors(corsOptions);

// Static file serving for uploads
const staticMiddleware = express.static(path.join(__dirname, '../uploads'));

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error response
  let status = 500;
  let message = 'Internal Server Error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = 'Not Found';
  } else if (err.name === 'ConflictError') {
    status = 409;
    message = 'Conflict';
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }
  
  // Send JSON error response
  res.status(status).json({ error: message });
};

// Method not allowed handler
const methodNotAllowed = (req, res, next) => {
  res.status(405).json({ error: 'Method Not Allowed' });
};

module.exports = {
  jsonParser,
  corsMiddleware,
  staticMiddleware,
  errorHandler,
  methodNotAllowed
};

