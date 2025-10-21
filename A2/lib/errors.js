/**
 * Centralized Error Handling System
 * 
 * Standardizes error responses across all routes
 * Always returns { "error": "<human message>" } format
 */

const { ValidationError } = require('./validation');

/**
 * Standard error response format
 * @param {string} message - Human-readable error message
 * @param {string} field - Field that caused the error (optional)
 * @returns {Object} - Standardized error response
 */
function createErrorResponse(message, field = null) {
  const response = { error: message };
  if (field) {
    response.field = field;
  }
  return response;
}

/**
 * HTTP Status Code Mappings
 */
const STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500
};

/**
 * Common error messages
 */
const ERROR_MESSAGES = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'Authentication required',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  INVALID_TOKEN: 'Invalid or expired token',
  ACCESS_DENIED: 'Access denied',
  
  // Validation
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  INVALID_VALUE: 'Invalid value',
  TOO_SHORT: 'Value is too short',
  TOO_LONG: 'Value is too long',
  OUT_OF_RANGE: 'Value is out of range',
  
  // Resource Management
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  CONFLICT: 'Resource conflict',
  DELETION_NOT_ALLOWED: 'Deletion not allowed',
  
  // Business Logic
  INSUFFICIENT_POINTS: 'Insufficient points',
  CAPACITY_EXCEEDED: 'Capacity exceeded',
  BUDGET_EXCEEDED: 'Budget exceeded',
  INVALID_OPERATION: 'Invalid operation',
  
  // System
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable'
};

/**
 * Error response factory functions
 */
const ErrorResponses = {
  // Authentication errors
  unauthorized: (message = ERROR_MESSAGES.AUTH_REQUIRED) => ({
    status: STATUS_CODES.UNAUTHORIZED,
    response: createErrorResponse(message)
  }),
  
  forbidden: (message = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS) => ({
    status: STATUS_CODES.FORBIDDEN,
    response: createErrorResponse(message)
  }),
  
  // Client errors
  badRequest: (message, field = null) => ({
    status: STATUS_CODES.BAD_REQUEST,
    response: createErrorResponse(message, field)
  }),
  
  notFound: (message = ERROR_MESSAGES.NOT_FOUND) => ({
    status: STATUS_CODES.NOT_FOUND,
    response: createErrorResponse(message)
  }),
  
  methodNotAllowed: (message = 'Method not allowed') => ({
    status: STATUS_CODES.METHOD_NOT_ALLOWED,
    response: createErrorResponse(message)
  }),
  
  conflict: (message = ERROR_MESSAGES.CONFLICT) => ({
    status: STATUS_CODES.CONFLICT,
    response: createErrorResponse(message)
  }),
  
  unprocessableEntity: (message, field = null) => ({
    status: STATUS_CODES.UNPROCESSABLE_ENTITY,
    response: createErrorResponse(message, field)
  }),
  
  // Server errors
  internalError: (message = ERROR_MESSAGES.INTERNAL_ERROR) => ({
    status: STATUS_CODES.INTERNAL_SERVER_ERROR,
    response: createErrorResponse(message)
  })
};

/**
 * Express error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.stack);
  
  // Handle validation errors
  if (err instanceof ValidationError) {
    const { status, response } = ErrorResponses.badRequest(err.message, err.field);
    return res.status(status).json(response);
  }
  
  // Handle JWT errors
  if (err.name === 'UnauthorizedError') {
    const { status, response } = ErrorResponses.unauthorized('Invalid or expired token');
    return res.status(status).json(response);
  }
  
  // Handle Prisma errors
  if (err.code === 'P2002') {
    const { status, response } = ErrorResponses.conflict('Resource already exists');
    return res.status(status).json(response);
  }
  
  if (err.code === 'P2025') {
    const { status, response } = ErrorResponses.notFound('Resource not found');
    return res.status(status).json(response);
  }
  
  // Handle custom business logic errors
  if (err.name === 'BusinessLogicError') {
    const { status, response } = ErrorResponses.badRequest(err.message);
    return res.status(status).json(response);
  }
  
  // Handle permission errors
  if (err.message && err.message.includes('Insufficient permissions')) {
    const { status, response } = ErrorResponses.forbidden(err.message);
    return res.status(status).json(response);
  }
  
  // Handle not found errors
  if (err.message && (
    err.message.includes('not found') ||
    err.message.includes('Not found')
  )) {
    const { status, response } = ErrorResponses.notFound(err.message);
    return res.status(status).json(response);
  }
  
  // Handle validation errors (generic)
  if (err.message && (
    err.message.includes('required') ||
    err.message.includes('must be') ||
    err.message.includes('Invalid') ||
    err.message.includes('cannot be')
  )) {
    const { status, response } = ErrorResponses.badRequest(err.message);
    return res.status(status).json(response);
  }
  
  // Default to internal server error
  const { status, response } = ErrorResponses.internalError();
  res.status(status).json(response);
}

/**
 * Express middleware for handling unsupported methods
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function methodNotAllowed(req, res, next) {
  const { status, response } = ErrorResponses.methodNotAllowed();
  res.status(status).json(response);
}

/**
 * Express middleware for handling missing routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function notFound(req, res, next) {
  const { status, response } = ErrorResponses.notFound('Route not found');
  res.status(status).json(response);
}

/**
 * Success response factory
 */
const SuccessResponses = {
  ok: (data = null, message = 'Success') => ({
    status: STATUS_CODES.OK,
    response: data ? { ...data, message } : { message }
  }),
  
  created: (data = null, message = 'Resource created successfully') => ({
    status: STATUS_CODES.CREATED,
    response: data ? { ...data, message } : { message }
  }),
  
  noContent: () => ({
    status: STATUS_CODES.NO_CONTENT,
    response: null
  })
};

/**
 * Express response helper functions
 */
const ResponseHelpers = {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} message - Success message
   */
  success: (res, data = null, message = 'Success') => {
    const { status, response } = SuccessResponses.ok(data, message);
    res.status(status).json(response);
  },
  
  /**
   * Send created response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} message - Success message
   */
  created: (res, data = null, message = 'Resource created successfully') => {
    const { status, response } = SuccessResponses.created(data, message);
    res.status(status).json(response);
  },
  
  /**
   * Send no content response
   * @param {Object} res - Express response object
   */
  noContent: (res) => {
    res.status(STATUS_CODES.NO_CONTENT).send();
  },
  
  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {number} status - HTTP status code
   * @param {string} message - Error message
   * @param {string} field - Field name (optional)
   */
  error: (res, status, message, field = null) => {
    res.status(status).json(createErrorResponse(message, field));
  }
};

module.exports = {
  // Status codes
  STATUS_CODES,
  
  // Error messages
  ERROR_MESSAGES,
  
  // Error response factories
  ErrorResponses,
  SuccessResponses,
  
  // Express middleware
  errorHandler,
  methodNotAllowed,
  notFound,
  
  // Response helpers
  ResponseHelpers,
  
  // Utility functions
  createErrorResponse
};

