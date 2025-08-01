const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    trim: true,
    minlength: [10, 'Content must be at least 10 characters long'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required'],
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const author = await User.findById(v);
        return author && (author.role === 'Teacher' || author.role === 'Admin');
      },
      message: 'Author must have Teacher or Admin role'
    }
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: function() {
      return !this.isGlobal;
    }
  },
  isGlobal: {
    type: Boolean,
    default: false,
    validate: {
      validator: async function(v) {
        // Only admins can create global announcements
        if (v) {
          const User = mongoose.model('User');
          const author = await User.findById(this.author);
          return author && author.role === 'Admin';
        }
        return true;
      },
      message: 'Only Admins can create global announcements'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'normal', 'high', 'urgent'],
      message: 'Priority must be low, normal, high, or urgent'
    },
    default: 'normal'
  }
}, {
  timestamps: true
});

// Pre-save validation for global/course logic
announcementSchema.pre('save', function(next) {
  // Global announcements cannot have a course
  if (this.isGlobal && this.course) {
    return next(new Error('Global announcements cannot have a course'));
  }
  next();
});

// Indexes for efficient queries
announcementSchema.index({ course: 1, createdAt: -1 });
announcementSchema.index({ isGlobal: 1, createdAt: -1 });
announcementSchema.index({ author: 1, createdAt: -1 });
announcementSchema.index({ isActive: 1, priority: -1, createdAt: -1 });

// Virtual to check if announcement is recent (within last 7 days)
announcementSchema.virtual('isRecent').get(function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.createdAt > sevenDaysAgo;
});

// Static method to get announcements for a specific user
announcementSchema.statics.getAnnouncementsForUser = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const query = {
    isActive: true,
    $or: [
      { isGlobal: true }, // Global announcements
    ]
  };

  // Add course-specific announcements for enrolled courses
  if (user.role === 'Student' && user.enrolledCourses.length > 0) {
    query.$or.push({
      course: { $in: user.enrolledCourses }
    });
  }

  // Teachers can see announcements for courses they teach
  if (user.role === 'Teacher') {
    const Course = mongoose.model('Course');
    const teacherCourses = await Course.find({ teacher: userId });
    if (teacherCourses.length > 0) {
      query.$or.push({
        course: { $in: teacherCourses.map(course => course._id) }
      });
    }
  }

  return this.find(query)
    .populate('author', 'name role')
    .populate('course', 'name')
    .sort({ priority: -1, createdAt: -1 });
};

// Instance method to check if user can edit this announcement
announcementSchema.methods.canUserEdit = function(userId, userRole) {
  // Admins can edit any announcement
  if (userRole === 'Admin') {
    return true;
  }
  
  // Authors can edit their own announcements
  return this.author.toString() === userId.toString();
};

module.exports = mongoose.model('Announcement', announcementSchema);