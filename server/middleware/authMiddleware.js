import { verifyToken, extractTokenFromHeader } from '../utils/generateToken.js';
import User from '../models/User.js';

/**
 * Middleware to authenticate JWT tokens
 * Adds user information to req.user if token is valid
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Find user in database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token. User not found.',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account has been deactivated.',
          code: 'ACCOUNT_DEACTIVATED'
        }
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: error.message || 'Invalid token',
        code: 'INVALID_TOKEN'
      }
    });
  }
};

/**
 * Middleware to authorize specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role: ${roles.join(' or ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user to req.user if token is provided and valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return next(); // Continue without authentication
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

export {
  authenticate,
  authorize,
  optionalAuth
};