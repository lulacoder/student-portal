import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Course from '../models/Course.js';
import File from '../models/File.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';

// @desc    Get assignments for a course
// @route   GET /api/assignments/course/:courseId
// @access  Private (Students enrolled in course, Teachers of course, Admins)
export const getAssignmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if course exists
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

    // Check authorization
    const isTeacher = userRole === 'Teacher' && course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';
    const isEnrolledStudent = userRole === 'Student' && course.enrolledStudents.includes(userId);

    if (!isTeacher && !isAdmin && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not authorized to view assignments for this course',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Get assignments
    const assignments = await Assignment.find({ 
      course: courseId, 
      isActive: true 
    })
    .populate('attachments.fileId', 'originalName filename size')
    .sort({ dueDate: 1 });

    // If student, include submission status
    if (userRole === 'Student') {
      const assignmentsWithSubmissions = await Promise.all(
        assignments.map(async (assignment) => {
          const submission = await Submission.findOne({
            assignment: assignment._id,
            student: userId
          });

          return {
            ...assignment.toObject(),
            submission: submission ? {
              _id: submission._id,
              submittedAt: submission.submittedAt,
              isLate: submission.isLate,
              isGraded: submission.isGraded,
              grade: submission.grade
            } : null
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: assignmentsWithSubmissions
      });
    }

    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting assignments by course:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve assignments',
        code: 'ASSIGNMENTS_FETCH_ERROR'
      }
    });
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private (Students enrolled in course, Teachers of course, Admins)
export const getAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id)
      .populate('course', 'name teacher enrolledStudents')
      .populate('attachments.fileId', 'originalName filename size');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND'
        }
      });
    }

    // Check authorization
    const isTeacher = userRole === 'Teacher' && assignment.course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';
    const isEnrolledStudent = userRole === 'Student' && assignment.course.enrolledStudents.includes(userId);

    if (!isTeacher && !isAdmin && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error getting assignment:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve assignment',
        code: 'ASSIGNMENT_FETCH_ERROR'
      }
    });
  }
};

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private (Teachers, Admins)
export const createAssignment = async (req, res) => {
  try {
    const { title, description, course, dueDate, pointValue } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!title || !description || !course || !dueDate || !pointValue) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'All fields are required: title, description, course, dueDate, pointValue',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      });
    }

    // Check if course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Course not found',
          code: 'COURSE_NOT_FOUND'
        }
      });
    }

    // Check authorization
    const isTeacher = userRole === 'Teacher' && courseDoc.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Only teachers and admins can create assignments',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Handle file attachments if present
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileDoc = new File({
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: userId
        });

        await fileDoc.save();
        attachments.push({
          name: file.originalname,
          fileId: fileDoc._id
        });
      }
    }

    // Create assignment
    const assignment = new Assignment({
      title,
      description,
      course,
      dueDate: new Date(dueDate),
      pointValue: Number(pointValue),
      attachments
    });

    await assignment.save();

    // Populate the assignment before sending response
    await assignment.populate('course', 'name');
    await assignment.populate('attachments.fileId', 'originalName filename size');

    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    
    // Clean up uploaded files if assignment creation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create assignment',
        code: 'ASSIGNMENT_CREATE_ERROR'
      }
    });
  }
};
// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Teachers of course, Admins)
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, pointValue } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id).populate('course', 'teacher');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND'
        }
      });
    }

    // Check authorization
    const isTeacher = userRole === 'Teacher' && assignment.course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Update fields if provided
    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = new Date(dueDate);
    if (pointValue) assignment.pointValue = Number(pointValue);

    // Handle new file attachments if present
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileDoc = new File({
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: userId
        });

        await fileDoc.save();
        assignment.attachments.push({
          name: file.originalname,
          fileId: fileDoc._id
        });
      }
    }

    await assignment.save();

    // Populate the assignment before sending response
    await assignment.populate('course', 'name');
    await assignment.populate('attachments.fileId', 'originalName filename size');

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update assignment',
        code: 'ASSIGNMENT_UPDATE_ERROR'
      }
    });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teachers of course, Admins)
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id).populate('course', 'teacher');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND'
        }
      });
    }

    // Check authorization
    const isTeacher = userRole === 'Teacher' && assignment.course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Soft delete by setting isActive to false
    assignment.isActive = false;
    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete assignment',
        code: 'ASSIGNMENT_DELETE_ERROR'
      }
    });
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Students enrolled in course)
export const submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { submissionText } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only students can submit assignments
    if (userRole !== 'Student') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only students can submit assignments',
          code: 'ACCESS_DENIED'
        }
      });
    }

    const assignment = await Assignment.findById(id).populate('course', 'enrolledStudents');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND'
        }
      });
    }

    // Check if student is enrolled in the course
    if (!assignment.course.enrolledStudents.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You are not enrolled in this course',
          code: 'NOT_ENROLLED'
        }
      });
    }

    // Check if assignment is still active and accepts submissions
    if (!assignment.acceptsSubmissions()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Assignment is no longer accepting submissions',
          code: 'SUBMISSION_CLOSED'
        }
      });
    }

    // Handle file attachments if present
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileDoc = new File({
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: userId
        });

        await fileDoc.save();
        attachments.push({
          name: file.originalname,
          fileId: fileDoc._id
        });
      }
    }

    // Check if submission already exists (for resubmission)
    let submission = await Submission.findOne({
      assignment: id,
      student: userId
    });

    if (submission) {
      // Update existing submission
      submission.submissionText = submissionText || submission.submissionText;
      submission.attachments = attachments.length > 0 ? attachments : submission.attachments;
      submission.submittedAt = new Date();
      submission.isLate = new Date() > assignment.dueDate;
      
      // Clear grade and feedback for resubmission
      submission.grade = undefined;
      submission.feedback = undefined;
      submission.gradedAt = undefined;
      submission.gradedBy = undefined;
    } else {
      // Create new submission
      submission = new Submission({
        assignment: id,
        student: userId,
        submissionText,
        attachments,
        submittedAt: new Date(),
        isLate: new Date() > assignment.dueDate
      });
    }

    await submission.save();

    // Populate the submission before sending response
    await submission.populate('student', 'name email');
    await submission.populate('attachments.fileId', 'originalName filename size');

    res.status(201).json({
      success: true,
      data: submission,
      message: submission.isNew ? 'Assignment submitted successfully' : 'Assignment resubmitted successfully'
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);

    // Clean up uploaded files if submission fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to submit assignment',
        code: 'SUBMISSION_ERROR'
      }
    });
  }
};

// @desc    Get submissions for an assignment
// @route   GET /api/assignments/:id/submissions
// @access  Private (Teachers of course, Admins)
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id).populate('course', 'teacher');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND'
        }
      });
    }

    // Check authorization
    const isTeacher = userRole === 'Teacher' && assignment.course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    const submissions = await Submission.find({ assignment: id })
      .populate('student', 'name email')
      .populate('attachments.fileId', 'originalName filename size')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error getting assignment submissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve submissions',
        code: 'SUBMISSIONS_FETCH_ERROR'
      }
    });
  }
};

// @desc    Grade a submission
// @route   PUT /api/assignments/submission/:submissionId/grade
// @access  Private (Teachers of course, Admins)
export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (grade === undefined || grade === null) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Grade is required',
          code: 'MISSING_GRADE'
        }
      });
    }

    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'assignment',
        populate: {
          path: 'course',
          select: 'teacher'
        }
      });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Submission not found',
          code: 'SUBMISSION_NOT_FOUND'
        }
      });
    }

    // Check authorization
    const isTeacher = userRole === 'Teacher' && submission.assignment.course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Validate grade is within assignment point value
    if (grade < 0 || grade > submission.assignment.pointValue) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Grade must be between 0 and ${submission.assignment.pointValue}`,
          code: 'INVALID_GRADE'
        }
      });
    }

    // Update submission with grade and feedback
    submission.grade = Number(grade);
    submission.feedback = feedback || '';
    submission.gradedAt = new Date();
    submission.gradedBy = userId;

    await submission.save();

    // Populate the submission before sending response
    await submission.populate('student', 'name email');
    await submission.populate('gradedBy', 'name');

    res.status(200).json({
      success: true,
      data: submission,
      message: 'Submission graded successfully'
    });
  } catch (error) {
    console.error('Error grading submission:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to grade submission',
        code: 'GRADING_ERROR'
      }
    });
  }
};

// @desc    Download file
// @route   GET /api/assignments/files/:fileId
// @access  Private (Authorized users only)
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'File not found',
          code: 'FILE_NOT_FOUND'
        }
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'File not found on server',
          code: 'FILE_NOT_FOUND_ON_DISK'
        }
      });
    }

    // Authorization check - user can download if:
    // 1. They uploaded the file
    // 2. They are admin
    // 3. They are teacher of a course that uses this file
    // 4. They are student enrolled in a course that uses this file
    
    if (file.uploadedBy.toString() === userId || userRole === 'Admin') {
      // User uploaded the file or is admin - allow download
    } else {
      // Check if file is used in assignments the user has access to
      const assignments = await Assignment.find({
        'attachments.fileId': fileId,
        isActive: true
      }).populate('course', 'teacher enrolledStudents');

      const submissions = await Submission.find({
        'attachments.fileId': fileId
      }).populate({
        path: 'assignment',
        populate: {
          path: 'course',
          select: 'teacher enrolledStudents'
        }
      });

      let hasAccess = false;

      // Check assignment attachments
      for (const assignment of assignments) {
        const isTeacher = userRole === 'Teacher' && assignment.course.teacher.toString() === userId;
        const isEnrolledStudent = userRole === 'Student' && assignment.course.enrolledStudents.includes(userId);
        
        if (isTeacher || isEnrolledStudent) {
          hasAccess = true;
          break;
        }
      }

      // Check submission attachments
      if (!hasAccess) {
        for (const submission of submissions) {
          const isTeacher = userRole === 'Teacher' && submission.assignment.course.teacher.toString() === userId;
          const isSubmissionOwner = userRole === 'Student' && submission.student.toString() === userId;
          
          if (isTeacher || isSubmissionOwner) {
            hasAccess = true;
            break;
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          }
        });
      }
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', file.size);

    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            message: 'Error downloading file',
            code: 'FILE_STREAM_ERROR'
          }
        });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to download file',
        code: 'FILE_DOWNLOAD_ERROR'
      }
    });
  }
};