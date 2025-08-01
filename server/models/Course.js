const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: [true, 'File reference is required']
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    minlength: [3, 'Course name must be at least 3 characters long'],
    maxlength: [100, 'Course name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    minlength: [10, 'Course description must be at least 10 characters long'],
    maxlength: [1000, 'Course description cannot exceed 1000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Course subject is required'],
    trim: true,
    minlength: [2, 'Subject must be at least 2 characters long'],
    maxlength: [50, 'Subject cannot exceed 50 characters']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Course teacher is required'],
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const teacher = await User.findById(v);
        return teacher && (teacher.role === 'Teacher' || teacher.role === 'Admin');
      },
      message: 'Teacher must have Teacher or Admin role'
    }
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const student = await User.findById(v);
        return student && student.role === 'Student';
      },
      message: 'Enrolled user must be a Student'
    }
  }],
  materials: [materialSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
courseSchema.index({ teacher: 1 });
courseSchema.index({ enrolledStudents: 1 });
courseSchema.index({ subject: 1 });
courseSchema.index({ isActive: 1 });

// Virtual for enrolled student count
courseSchema.virtual('enrollmentCount').get(function() {
  return this.enrolledStudents.length;
});

// Instance method to check if user is enrolled
courseSchema.methods.isStudentEnrolled = function(studentId) {
  return this.enrolledStudents.some(id => id.toString() === studentId.toString());
};

// Instance method to enroll student
courseSchema.methods.enrollStudent = function(studentId) {
  if (!this.isStudentEnrolled(studentId)) {
    this.enrolledStudents.push(studentId);
  }
};

// Instance method to unenroll student
courseSchema.methods.unenrollStudent = function(studentId) {
  this.enrolledStudents = this.enrolledStudents.filter(
    id => id.toString() !== studentId.toString()
  );
};

module.exports = mongoose.model('Course', courseSchema);