import mongoose from 'mongoose';

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

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    minlength: [3, 'Assignment title must be at least 3 characters long'],
    maxlength: [200, 'Assignment title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    trim: true,
    minlength: [10, 'Assignment description must be at least 10 characters long'],
    maxlength: [2000, 'Assignment description cannot exceed 2000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(v) {
        // Due date should be in the future (for new assignments)
        if (this.isNew) {
          return v > new Date();
        }
        return true;
      },
      message: 'Due date must be in the future'
    }
  },
  pointValue: {
    type: Number,
    required: [true, 'Point value is required'],
    min: [0, 'Point value cannot be negative'],
    max: [1000, 'Point value cannot exceed 1000']
  },
  attachments: [attachmentSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
assignmentSchema.index({ course: 1, dueDate: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isActive: 1 });

// Virtual to check if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Virtual to get days until due
assignmentSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  const timeDiff = this.dueDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Instance method to check if assignment accepts submissions
assignmentSchema.methods.acceptsSubmissions = function() {
  return this.isActive && new Date() <= this.dueDate;
};

export default mongoose.model('Assignment', assignmentSchema);