// Utility functions for the A2 Loyalty API

/**
 * Format error response
 */
const formatError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate UofT email domain
 */
const isUofTEmail = (email) => {
  const uoftDomains = [
    'mail.utoronto.ca',
    'utoronto.ca',
    'student.utoronto.ca'
  ];
  
  const domain = email.split('@')[1];
  return uoftDomains.includes(domain);
};

/**
 * Validate utorid format
 */
const isValidUtorid = (utorid) => {
  if (!utorid || typeof utorid !== 'string') {
    return false;
  }
  
  if (utorid.length < 7 || utorid.length > 8) {
    return false;
  }
  
  return /^[a-zA-Z0-9]+$/.test(utorid);
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return null;
  
  const d = new Date(date);
  return d.toISOString();
};

/**
 * Check if date is in the past
 */
const isPastDate = (date) => {
  if (!date) return false;
  
  const now = new Date();
  const checkDate = new Date(date);
  
  return checkDate < now;
};

/**
 * Check if date is in the future
 */
const isFutureDate = (date) => {
  if (!date) return false;
  
  const now = new Date();
  const checkDate = new Date(date);
  
  return checkDate > now;
};

module.exports = {
  formatError,
  isValidEmail,
  isUofTEmail,
  isValidUtorid,
  sanitizeString,
  generateRandomString,
  formatDate,
  isPastDate,
  isFutureDate
};

