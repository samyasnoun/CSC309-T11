/**
 * Input Validation Utilities
 * 
 * Provides schema helpers for type, length, enum, email domain validation
 * without external libraries
 */

/**
 * Validation error class for structured error handling
 */
class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Standardized error response format
 * @param {string} message - Error message
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
 * Validate string type and length
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum length
 * @param {number} options.maxLength - Maximum length
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {string} - Validated string
 * @throws {ValidationError} - If validation fails
 */
function validateString(value, options = {}) {
  const {
    minLength = 0,
    maxLength = Infinity,
    required = true,
    fieldName = 'field'
  } = options;
  
  if (required && (value === undefined || value === null || value === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null && value !== '') {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
    }
    
    if (value.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, fieldName, value);
    }
    
    if (value.length > maxLength) {
      throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters long`, fieldName, value);
    }
  }
  
  return value;
}

/**
 * Validate number type and range
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {number} - Validated number
 * @throws {ValidationError} - If validation fails
 */
function validateNumber(value, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    required = true,
    fieldName = 'field'
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null) {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value);
    }
    
    if (numValue < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
    }
    
    if (numValue > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max}`, fieldName, value);
    }
    
    return numValue;
  }
  
  return value;
}

/**
 * Validate email format and domain
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedDomains - Allowed email domains
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {string} - Validated email
 * @throws {ValidationError} - If validation fails
 */
function validateEmail(value, options = {}) {
  const {
    allowedDomains = [],
    required = true,
    fieldName = 'email'
  } = options;
  
  if (required && (value === undefined || value === null || value === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null && value !== '') {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid email address`, fieldName, value);
    }
    
    // Domain validation
    if (allowedDomains.length > 0) {
      const domain = value.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        throw new ValidationError(`${fieldName} must be from one of the allowed domains: ${allowedDomains.join(', ')}`, fieldName, value);
      }
    }
  }
  
  return value;
}

/**
 * Validate enum value
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {any} - Validated value
 * @throws {ValidationError} - If validation fails
 */
function validateEnum(value, allowedValues, options = {}) {
  const {
    required = true,
    fieldName = 'field'
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null) {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`, fieldName, value);
    }
  }
  
  return value;
}

/**
 * Validate date string and range
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {Date} options.minDate - Minimum date
 * @param {Date} options.maxDate - Maximum date
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Date} - Validated date
 * @throws {ValidationError} - If validation fails
 */
function validateDate(value, options = {}) {
  const {
    minDate = null,
    maxDate = null,
    required = true,
    fieldName = 'date'
  } = options;
  
  if (required && (value === undefined || value === null || value === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null && value !== '') {
    const dateValue = new Date(value);
    
    if (isNaN(dateValue.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid date`, fieldName, value);
    }
    
    if (minDate && dateValue < minDate) {
      throw new ValidationError(`${fieldName} cannot be before ${minDate.toISOString()}`, fieldName, value);
    }
    
    if (maxDate && dateValue > maxDate) {
      throw new ValidationError(`${fieldName} cannot be after ${maxDate.toISOString()}`, fieldName, value);
    }
    
    return dateValue;
  }
  
  return value;
}

/**
 * Validate boolean value
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {boolean} - Validated boolean
 * @throws {ValidationError} - If validation fails
 */
function validateBoolean(value, options = {}) {
  const {
    required = true,
    fieldName = 'field'
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null) {
    if (typeof value !== 'boolean') {
      throw new ValidationError(`${fieldName} must be a boolean`, fieldName, value);
    }
  }
  
  return value;
}

/**
 * Validate array of values
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum array length
 * @param {number} options.maxLength - Maximum array length
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Array} - Validated array
 * @throws {ValidationError} - If validation fails
 */
function validateArray(value, options = {}) {
  const {
    minLength = 0,
    maxLength = Infinity,
    required = true,
    fieldName = 'field'
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null) {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
    }
    
    if (value.length < minLength) {
      throw new ValidationError(`${fieldName} must have at least ${minLength} items`, fieldName, value);
    }
    
    if (value.length > maxLength) {
      throw new ValidationError(`${fieldName} must have no more than ${maxLength} items`, fieldName, value);
    }
  }
  
  return value;
}

/**
 * Validate utorid format (7-8 alphanumeric characters)
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {string} - Validated utorid
 * @throws {ValidationError} - If validation fails
 */
function validateUtorid(value, options = {}) {
  const {
    required = true,
    fieldName = 'utorid'
  } = options;
  
  if (required && (value === undefined || value === null || value === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null && value !== '') {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
    }
    
    // Check length (7-8 characters)
    if (value.length < 7 || value.length > 8) {
      throw new ValidationError(`${fieldName} must be 7-8 characters long`, fieldName, value);
    }
    
    // Check alphanumeric only
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(value)) {
      throw new ValidationError(`${fieldName} must contain only alphanumeric characters`, fieldName, value);
    }
  }
  
  return value;
}

/**
 * Validate pagination parameters with defaults
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.defaultPage - Default page number
 * @param {number} options.defaultLimit - Default limit
 * @param {number} options.maxLimit - Maximum allowed limit
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Object} - Validated pagination object
 * @throws {ValidationError} - If validation fails
 */
function validatePagination(value, options = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
    fieldName = 'pagination'
  } = options;
  
  if (value === undefined || value === null) {
    return { page: defaultPage, limit: defaultLimit };
  }
  
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName, value);
  }
  
  const page = validateNumber(value.page, {
    min: 1,
    required: false,
    fieldName: 'page'
  }) || defaultPage;
  
  const limit = validateNumber(value.limit, {
    min: 1,
    max: maxLimit,
    required: false,
    fieldName: 'limit'
  }) || defaultLimit;
  
  return { page, limit };
}

/**
 * Validate object structure
 * @param {any} value - Value to validate
 * @param {Object} schema - Validation schema
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Object} - Validated object
 * @throws {ValidationError} - If validation fails
 */
function validateObject(value, schema, options = {}) {
  const {
    required = true,
    fieldName = 'field'
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  
  if (value !== undefined && value !== null) {
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an object`, fieldName, value);
    }
    
    // Validate each field in the schema
    for (const [key, validator] of Object.entries(schema)) {
      try {
        validator(value[key]);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`${fieldName}.${key}: ${error.message}`, `${fieldName}.${key}`, value[key]);
        }
        throw error;
      }
    }
  }
  
  return value;
}

/**
 * Express middleware for validation error handling
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleValidationError(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(400).json(createErrorResponse(err.message, err.field));
  }
  
  next(err);
}

/**
 * Create validation middleware for request body
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware function
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = validateObject(req.body, schema, { fieldName: 'body' });
      next();
    } catch (error) {
      handleValidationError(error, req, res, next);
    }
  };
}

/**
 * Create validation middleware for query parameters
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = validateObject(req.query, schema, { fieldName: 'query' });
      next();
    } catch (error) {
      handleValidationError(error, req, res, next);
    }
  };
}

/**
 * Create validation middleware for route parameters
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = validateObject(req.params, schema, { fieldName: 'params' });
      next();
    } catch (error) {
      handleValidationError(error, req, res, next);
    }
  };
}

module.exports = {
  // Error classes
  ValidationError,
  
  // Error response utilities
  createErrorResponse,
  
  // Core validation functions
  validateString,
  validateNumber,
  validateEmail,
  validateEnum,
  validateDate,
  validateBoolean,
  validateArray,
  validateObject,
  validateUtorid,
  validatePagination,
  
  // Express middleware
  handleValidationError,
  validateBody,
  validateQuery,
  validateParams
};
