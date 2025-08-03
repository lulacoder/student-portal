import Announcement from '../models/Announcement.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

// Create a new announcement
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, courseId, isGlobal, priority } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate global announcement permissions
    if (isGlobal && userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only administrators can create global announcements',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    // Validate course-specific announcement permissions
    if (!isGlobal && courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Course not found',
            code: 'COURSE_NOT_FOUND'
          }
        });
      }

      // Check if user can create announcements for this course
      if (userRole === 'Teacher' && course.teacher.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'You can only create announcements for courses you teach',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }
    }

    // Create announcement
    const announcementData = {
      title,
      content,
      author: userId,
      isGlobal: isGlobal || false,
      priority: priority || 'normal'
    };

    if (!isGlobal && courseId) {
      announcementData.course = courseId;
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    // Populate author and course information
    await announcement.populate('author', 'name role');
    if (announcement.course) {
      await announcement.populate('course', 'name');
    }

    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create announcement',
        code: 'CREATE_ANNOUNCEMENT_FAILED'
      }
    });
  }
};

// Get all announcements for the current user
export const getAnnouncementsForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const announcements = await Announcement.getAnnouncementsForUser(userId);

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch announcements',
        code: 'FETCH_ANNOUNCEMENTS_FAILED'
      }
    });
  }
};

// Get global announcements
export const getGlobalAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({
      isGlobal: true,
      isActive: true
    })
      .populate('author', 'name role')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get global announcements error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch global announcements',
        code: 'FETCH_GLOBAL_ANNOUNCEMENTS_FAILED'
      }
    });
  }
};

// Get announcements for a specific course
export const getCourseAnnouncements = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Course not found',
          code: 'COURSE_NOT_FOUND'
        }
      });
    }

    // Check if user has access to this course
    const hasAccess = userRole === 'Admin' || 
                     course.teacher.toString() === userId ||
                     course.enrolledStudents.includes(userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have access to this course',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    const announcements = await Announcement.find({
      course: courseId,
      isActive: true
    })
      .populate('author', 'name role')
      .populate('course', 'name')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get course announcements error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch course announcements',
        code: 'FETCH_COURSE_ANNOUNCEMENTS_FAILED'
      }
    });
  }
};

// Get a specific announcement by ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const announcement = await Announcement.findById(id)
      .populate('author', 'name role')
      .populate('course', 'name');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Announcement not found',
          code: 'ANNOUNCEMENT_NOT_FOUND'
        }
      });
    }

    // Check if user has access to this announcement
    let hasAccess = false;

    if (announcement.isGlobal) {
      hasAccess = true; // Global announcements are visible to all
    } else if (announcement.course) {
      const course = await Course.findById(announcement.course._id);
      hasAccess = userRole === 'Admin' || 
                 course.teacher.toString() === userId ||
                 course.enrolledStudents.includes(userId);
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have access to this announcement',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Get announcement by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch announcement',
        code: 'FETCH_ANNOUNCEMENT_FAILED'
      }
    });
  }
};

// Update an announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Announcement not found',
          code: 'ANNOUNCEMENT_NOT_FOUND'
        }
      });
    }

    // Check if user can edit this announcement
    if (!announcement.canUserEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to edit this announcement',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    // Update announcement
    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (priority !== undefined) announcement.priority = priority;

    await announcement.save();

    // Populate author and course information
    await announcement.populate('author', 'name role');
    if (announcement.course) {
      await announcement.populate('course', 'name');
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to update announcement',
        code: 'UPDATE_ANNOUNCEMENT_FAILED'
      }
    });
  }
};

// Delete an announcement (soft delete by setting isActive to false)
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Announcement not found',
          code: 'ANNOUNCEMENT_NOT_FOUND'
        }
      });
    }

    // Check if user can delete this announcement
    if (!announcement.canUserEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to delete this announcement',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    // Soft delete by setting isActive to false
    announcement.isActive = false;
    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete announcement',
        code: 'DELETE_ANNOUNCEMENT_FAILED'
      }
    });
  }
};

// Get announcements by author (for teachers/admins to see their own announcements)
export const getAnnouncementsByAuthor = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only teachers and admins can view their authored announcements
    if (userRole === 'Student') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Students cannot access this endpoint',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    const announcements = await Announcement.find({
      author: userId,
      isActive: true
    })
      .populate('author', 'name role')
      .populate('course', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get announcements by author error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch authored announcements',
        code: 'FETCH_AUTHORED_ANNOUNCEMENTS_FAILED'
      }
    });
  }
};