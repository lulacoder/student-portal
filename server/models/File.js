import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    unique: true
  },
  mimetype: {
    type: String,
    required: [true, 'File mimetype is required'],
    validate: {
      validator: function(v) {
        // Allow common file types for educational content
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/zip',
          'application/x-zip-compressed'
        ];
        return allowedTypes.includes(v);
      },
      message: 'File type not allowed'
    }
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    max: [50 * 1024 * 1024, 'File size cannot exceed 50MB'] // 50MB limit
  },
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
fileSchema.index({ uploadedBy: 1, uploadedAt: -1 });
fileSchema.index({ filename: 1 });

export default mongoose.model('File', fileSchema);