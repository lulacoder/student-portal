const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role, studentId, teacherCredentials } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name, email, password, and role are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      });
    }

    // Validate role
    const validRoles = ['Student', 'Teacher'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Role must be either Student or Teacher. Admin accounts cannot be created through registration.',
          code: 'INVALID_ROLE'
        }
      });
    }

    // Validate role-specific fields
    if (role === 'Student' && !studentId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Student ID is required for student registration',
          code: 'MISSING_STUDENT_ID'
        }
      });
    }

    if (role === 'Teacher' && !teacherCredentials) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Teacher credentials are required for teacher registration',
          code: 'MISSING_TEACHER_CREDENTIALS'
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_ALREADY_EXISTS'
        }
      });
    }

    // Check if student ID is already taken (for students)
    if (role === 'Student') {
      const existingStudent = await User.findOne({ studentId, role: 'Student' });
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Student ID is already taken',
            code: 'STUDENT_ID_EXISTS'
          }
        });
      }
    }

    // Create user data object
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role
    };

    // Add role-specific fields
    if (role === 'Student') {
      userData.studentId = studentId.trim();
    } else if (role === 'Teacher') {
      userData.teacherCredentials = teacherCredentials.trim();
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.role);

    // Return success response with user data (without password)
    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toSafeObject()
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    // Handle validation errors
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

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: {
          message: `${field} already exists`,
          code: 'DUPLICATE_FIELD'
        }
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during registration',
        code: 'REGISTRATION_ERROR'
      }
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        }
      });
    }

    // Find user by email and include password for comparison
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account has been deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        }
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.role);

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        token,
        user: user.toSafeObject()
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during login',
        code: 'LOGIN_ERROR'
      }
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // User is already attached to req by authenticate middleware
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses', 'name description subject')
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
      data: {
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error while fetching profile',
        code: 'PROFILE_ERROR'
      }
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, studentId, teacherCredentials } = req.body;
    const userId = req.user._id;

    // Find current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Update allowed fields
    if (name) {
      user.name = name.trim();
    }

    // Update role-specific fields
    if (user.role === 'Student' && studentId) {
      // Check if student ID is already taken by another user
      const existingStudent = await User.findOne({ 
        studentId: studentId.trim(), 
        role: 'Student',
        _id: { $ne: userId }
      });
      
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Student ID is already taken',
            code: 'STUDENT_ID_EXISTS'
          }
        });
      }
      
      user.studentId = studentId.trim();
    }

    if (user.role === 'Teacher' && teacherCredentials) {
      user.teacherCredentials = teacherCredentials.trim();
    }

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject()
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    // Handle validation errors
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

    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error while updating profile',
        code: 'UPDATE_PROFILE_ERROR'
      }
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};