const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Attachment name is required'],
    trim: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: [true, 'File reference is required']
  }
});

const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const student = await User.findById(v);
        return student && student.role === 'Student';
      },
      message: 'Submitter must be a Student'
    }
  },
  submissionText: {
    type: String,
    trim: true,
    maxlength: [5000, 'Submission text cannot exceed 5000 characters']
  },
  attachments: [attachmentSchema],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  grade: {
    type: Number,
    min: [0, 'Grade cannot be negative'],
    validate: {
      validator: async function(v) {
        if (v === undefined || v === null) return true;
        
        // Check if grade is within assignment's point value
        const Assignment = mongoose.model('Assignment');
        const assignment = await Assignment.findById(this.assignment);
        return assignment && v <= assignment.pointValue;
      },
      message: 'Grade cannot exceed assignment point value'
    }
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters']
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(v) {
        if (!v) return true; // Optional field
        
        const User = mongoose.model('User');
        const grader = await User.findById(v);
        return grader && (grader.role === 'Teacher' || grader.role === 'Admin');
      },
      message: 'Grader must have Teacher or Admin role'
    }
  }
}, {
  timestamps: true
});

// Compound index to ensure one submission per student per assignment
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Other indexes for efficient queries
submissionSchema.index({ student: 1, submittedAt: -1 });
submissionSchema.index({ assignment: 1, submittedAt: -1 });
submissionSchema.index({ gradedBy: 1, gradedAt: -1 });

// Pre-save middleware to set isLate flag
submissionSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('submittedAt')) {
    try {
      const Assignment = mongoose.model('Assignment');
      const assignment = await Assignment.findById(this.assignment);
      
      if (assignment) {
        this.isLate = this.submittedAt > assignment.dueDate;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to set gradedAt when grade is added
submissionSchema.pre('save', function(next) {
  if (this.isModified('grade') && this.grade !== undefined && this.grade !== null) {
    this.gradedAt = new Date();
  }
  next();
});

// Virtual to check if submission is graded
submissionSchema.virtual('isGraded').get(function() {
  return this.grade !== undefined && this.grade !== null;
});

// Instance method to calculate grade percentage
submissionSchema.methods.getGradePercentage = async function() {
  if (!this.isGraded) return null;
  
  const Assignment = mongoose.model('Assignment');
  const assignment = await Assignment.findById(this.assignment);
  
  if (!assignment) return null;
  
  return (this.grade / assignment.pointValue) * 100;
};

module.exports = mongoose.model('Submission', submissionSchema);