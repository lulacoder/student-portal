import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve user profile',
        code: 'PROFILE_RETRIEVAL_ERROR'
      }
    });
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/profile
 * @access Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const { name, email, studentId, teacherCredentials, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Validate email uniqueness if email is being changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email already exists',
            code: 'EMAIL_EXISTS'
          }
        });
      }
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email;
    
    // Update role-specific fields
    if (user.role === 'Student' && studentId !== undefined) {
      user.studentId = studentId;
    }
    if (user.role === 'Teacher' && teacherCredentials !== undefined) {
      user.teacherCredentials = teacherCredentials;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Current password is required to set new password',
            code: 'CURRENT_PASSWORD_REQUIRED'
          }
        });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Current password is incorrect',
            code: 'INVALID_CURRENT_PASSWORD'
          }
        });
      }

      user.password = newPassword;
    }

    await user.save();

    // Return user without password
    const updatedUser = await User.findById(user._id)
      .select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update user profile',
        code: 'PROFILE_UPDATE_ERROR'
      }
    });
  }
};
/**
 
* Get all users (Admin only)
 * @route GET /api/users
 * @access Private/Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    if (role && ['Student', 'Teacher', 'Admin'].includes(role)) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve users',
        code: 'USERS_RETRIEVAL_ERROR'
      }
    });
  }
};

/**
 * Get user by ID (Admin only)
 * @route GET /api/users/:id
 * @access Private/Admin
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID format',
          code: 'INVALID_USER_ID'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve user',
        code: 'USER_RETRIEVAL_ERROR'
      }
    });
  }
};

/**
 * Create new user (Admin only)
 * @route POST /api/users
 * @access Private/Admin
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, studentId, teacherCredentials } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_EXISTS'
        }
      });
    }

    // Validate required fields based on role
    if (role === 'Student' && !studentId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Student ID is required for Student role',
          code: 'STUDENT_ID_REQUIRED'
        }
      });
    }

    if (role === 'Teacher' && !teacherCredentials) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Teacher credentials are required for Teacher role',
          code: 'TEACHER_CREDENTIALS_REQUIRED'
        }
      });
    }

    // Create user object
    const userData = {
      name,
      email,
      password,
      role
    };

    if (role === 'Student') {
      userData.studentId = studentId;
    }
    if (role === 'Teacher') {
      userData.teacherCredentials = teacherCredentials;
    }

    const user = new User(userData);
    await user.save();

    // Return user without password
    const newUser = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_EXISTS'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create user',
        code: 'USER_CREATION_ERROR'
      }
    });
  }
};

/**
 * Update user (Admin only)
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
const updateUser = async (req, res) => {
  try {
    const { name, email, role, studentId, teacherCredentials, isActive, password } = req.body;
    
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Validate email uniqueness if email is being changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email already exists',
            code: 'EMAIL_EXISTS'
          }
        });
      }
    }

    // Update basic fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

    // Handle role change
    if (role && role !== user.role) {
      if (!['Student', 'Teacher', 'Admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid role specified',
            code: 'INVALID_ROLE'
          }
        });
      }
      
      user.role = role;
      
      // Clear role-specific fields when changing roles
      if (role !== 'Student') {
        user.studentId = undefined;
      }
      if (role !== 'Teacher') {
        user.teacherCredentials = undefined;
      }
    }

    // Update role-specific fields
    if (user.role === 'Student') {
      if (studentId !== undefined) user.studentId = studentId;
    }
    if (user.role === 'Teacher') {
      if (teacherCredentials !== undefined) user.teacherCredentials = teacherCredentials;
    }

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(user._id)
      .select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID format',
          code: 'INVALID_USER_ID'
        }
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update user',
        code: 'USER_UPDATE_ERROR'
      }
    });
  }
};

/**
 * Delete user (Admin only)
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF'
        }
      });
    }

    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID format',
          code: 'INVALID_USER_ID'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete user',
        code: 'USER_DELETION_ERROR'
      }
    });
  }
};

export {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};