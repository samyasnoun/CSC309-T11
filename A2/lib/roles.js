/**
 * Centralized Role-Based Access Control (RBAC) System
 * 
 * Defines role hierarchy and provides helper functions for permission checking
 */

// Role hierarchy with numeric ranks (higher = more permissions)
const ROLE_HIERARCHY = {
  'regular': 1,
  'cashier': 2,
  'organizer': 3,
  'manager': 4,
  'superuser': 5
};

/**
 * Check if a user role has at least the required role level
 * @param {string} userRole - The user's role
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean} - True if user has sufficient permissions
 */
function hasAtLeast(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Get all roles that have at least the specified level
 * @param {string} minRole - Minimum role level
 * @returns {string[]} - Array of roles with sufficient permissions
 */
function getRolesWithAtLeast(minRole) {
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  
  return Object.keys(ROLE_HIERARCHY).filter(role => 
    ROLE_HIERARCHY[role] >= minLevel
  );
}

/**
 * Get role level for a given role
 * @param {string} role - The role to check
 * @returns {number} - The role level (0 if invalid)
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}

/**
 * Check if a role is valid
 * @param {string} role - The role to validate
 * @returns {boolean} - True if role is valid
 */
function isValidRole(role) {
  return role && ROLE_HIERARCHY.hasOwnProperty(role);
}

/**
 * Get all available roles
 * @returns {string[]} - Array of all valid roles
 */
function getAllRoles() {
  return Object.keys(ROLE_HIERARCHY);
}

/**
 * Get role display name with proper capitalization
 * @param {string} role - The role to format
 * @returns {string} - Formatted role name
 */
function getRoleDisplayName(role) {
  if (!isValidRole(role)) {
    return 'Unknown';
  }
  
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get role requirements for different operations
 * @returns {Object} - Object mapping operations to required roles
 */
function getOperationRequirements() {
  return {
    // User management
    'view_users': 'cashier',
    'create_users': 'cashier',
    'update_users': 'manager',
    'delete_users': 'superuser',
    
    // Transaction management
    'create_purchase': 'cashier',
    'create_adjustment': 'manager',
    'create_redemption': 'regular',
    'create_transfer': 'regular',
    'create_event_transaction': 'organizer',
    'process_transaction': 'cashier',
    'flag_suspicious': 'manager',
    
    // Event management
    'create_event': 'regular',
    'update_event': 'organizer',
    'manage_organizers': 'manager',
    'award_points': 'organizer',
    
    // Profile management
    'view_own_profile': 'regular',
    'update_own_profile': 'regular',
    'change_password': 'regular'
  };
}

/**
 * Check if user can perform a specific operation
 * @param {string} userRole - The user's role
 * @param {string} operation - The operation to check
 * @returns {boolean} - True if user can perform the operation
 */
function canPerformOperation(userRole, operation) {
  const requirements = getOperationRequirements();
  const requiredRole = requirements[operation];
  
  if (!requiredRole) {
    return false; // Unknown operation
  }
  
  return hasAtLeast(userRole, requiredRole);
}

/**
 * Get required role for an operation
 * @param {string} operation - The operation to check
 * @returns {string|null} - Required role or null if operation doesn't exist
 */
function getRequiredRoleForOperation(operation) {
  const requirements = getOperationRequirements();
  return requirements[operation] || null;
}

/**
 * Express middleware factory for role-based authorization
 * @param {string} requiredRole - Minimum required role
 * @returns {Function} - Express middleware function
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!hasAtLeast(req.auth.role, requiredRole)) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required: ${getRoleDisplayName(requiredRole)} or higher` 
      });
    }
    
    next();
  };
}

/**
 * Express middleware for any authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAny(req, res, next) {
  if (!req.auth || !req.auth.role) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  next();
}

/**
 * Express middleware for specific role only
 * @param {string} exactRole - Exact role required
 * @returns {Function} - Express middleware function
 */
function requireExactRole(exactRole) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.auth.role !== exactRole) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${getRoleDisplayName(exactRole)}` 
      });
    }
    
    next();
  };
}

/**
 * Express middleware for operation-based authorization
 * @param {string} operation - The operation to authorize
 * @returns {Function} - Express middleware function
 */
function requireOperation(operation) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!canPerformOperation(req.auth.role, operation)) {
      const requiredRole = getRequiredRoleForOperation(operation);
      return res.status(403).json({ 
        error: `Insufficient permissions for ${operation}. Required: ${getRoleDisplayName(requiredRole)} or higher` 
      });
    }
    
    next();
  };
}

module.exports = {
  // Role hierarchy
  ROLE_HIERARCHY,
  
  // Core functions
  hasAtLeast,
  getRolesWithAtLeast,
  getRoleLevel,
  isValidRole,
  getAllRoles,
  getRoleDisplayName,
  
  // Operation-based authorization
  getOperationRequirements,
  canPerformOperation,
  getRequiredRoleForOperation,
  
  // Express middleware
  requireRole,
  requireAny,
  requireExactRole,
  requireOperation,
  
  // Convenience middleware for common roles
  requireRegular: requireRole('regular'),
  requireCashier: requireRole('cashier'),
  requireOrganizer: requireRole('organizer'),
  requireManager: requireRole('manager'),
  requireSuperuser: requireRole('superuser')
};

