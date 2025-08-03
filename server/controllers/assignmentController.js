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

    // Validate required fields
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
      .populate('student', 'name email')
      .populate({
        path: 'assignment',
        select: 'title pointValue dueDate',
        populate: {
          path: 'course',
          select: 'name teacher'
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
          message: 'Access denied. Only teachers and admins can grade submissions',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Validate grade is numeric and within valid range
    const numericGrade = Number(grade);
    if (isNaN(numericGrade)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Grade must be a valid number',
          code: 'INVALID_GRADE_FORMAT'
        }
      });
    }

    if (numericGrade < 0 || numericGrade > submission.assignment.pointValue) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Grade must be between 0 and ${submission.assignment.pointValue} points`,
          code: 'INVALID_GRADE_RANGE'
        }
      });
    }

    // Store previous grade for comparison
    const previousGrade = submission.grade;
    const wasGraded = submission.isGraded;

    // Update submission with grade and feedback
    submission.grade = numericGrade;
    submission.feedback = feedback?.trim() || '';
    submission.gradedAt = new Date();
    submission.gradedBy = userId;

    await submission.save();

    // Calculate grade percentage and letter grade
    const gradePercentage = (numericGrade / submission.assignment.pointValue) * 100;
    const letterGrade = calculateLetterGrade(gradePercentage);

    // Populate the submission before sending response
    await submission.populate('gradedBy', 'name email');

    // Prepare response data with additional grade information
    const responseData = {
      ...submission.toObject(),
      gradePercentage: Math.round(gradePercentage * 100) / 100, // Round to 2 decimal places
      letterGrade,
      isRegrade: wasGraded && previousGrade !== numericGrade,
      previousGrade: wasGraded ? previousGrade : null
    };

    const message = wasGraded ?
      'Submission regraded successfully' :
      'Submission graded successfully';

    res.status(200).json({
      success: true,
      data: responseData,
      message
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

// @desc    Bulk grade multiple submissions for an assignment
// @route   PUT /api/assignments/assignment/:assignmentId/bulk-grade
// @access  Private (Teachers of course, Admins)
export const bulkGradeSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { grades } = req.body; // Array of { submissionId, grade, feedback }
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate input
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Grades array is required and must not be empty',
          code: 'MISSING_GRADES'
        }
      });
    }

    // Check if assignment exists
    const assignment = await Assignment.findById(assignmentId)
      .populate('course', 'teacher name');

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
          message: 'Access denied. Only teachers and admins can grade submissions',
          code: 'ACCESS_DENIED'
        }
      });
    }

    const results = {
      successful: [],
      failed: [],
      totalProcessed: grades.length
    };

    // Process each grade
    for (const gradeData of grades) {
      try {
        const { submissionId, grade, feedback } = gradeData;

        // Validate individual grade data
        if (!submissionId || grade === undefined || grade === null) {
          results.failed.push({
            submissionId: submissionId || 'unknown',
            error: 'Missing submissionId or grade'
          });
          continue;
        }

        // Find the submission
        const submission = await Submission.findById(submissionId)
          .populate('student', 'name email');

        if (!submission) {
          results.failed.push({
            submissionId,
            error: 'Submission not found'
          });
          continue;
        }

        // Verify submission belongs to this assignment
        if (submission.assignment.toString() !== assignmentId) {
          results.failed.push({
            submissionId,
            error: 'Submission does not belong to this assignment'
          });
          continue;
        }

        // Validate grade
        const numericGrade = Number(grade);
        if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > assignment.pointValue) {
          results.failed.push({
            submissionId,
            error: `Grade must be between 0 and ${assignment.pointValue}`
          });
          continue;
        }

        // Update submission
        const previousGrade = submission.grade;
        const wasGraded = submission.isGraded;

        submission.grade = numericGrade;
        submission.feedback = feedback?.trim() || '';
        submission.gradedAt = new Date();
        submission.gradedBy = userId;

        await submission.save();

        // Calculate additional grade info
        const gradePercentage = (numericGrade / assignment.pointValue) * 100;
        const letterGrade = calculateLetterGrade(gradePercentage);

        results.successful.push({
          submissionId,
          studentName: submission.student.name,
          grade: numericGrade,
          gradePercentage: Math.round(gradePercentage * 100) / 100,
          letterGrade,
          isRegrade: wasGraded && previousGrade !== numericGrade,
          previousGrade: wasGraded ? previousGrade : null
        });

      } catch (error) {
        console.error(`Error grading submission ${gradeData.submissionId}:`, error);
        results.failed.push({
          submissionId: gradeData.submissionId || 'unknown',
          error: error.message || 'Unknown error occurred'
        });
      }
    }

    const message = `Bulk grading completed. ${results.successful.length} successful, ${results.failed.length} failed.`;

    res.status(200).json({
      success: true,
      data: results,
      message
    });

  } catch (error) {
    console.error('Error in bulk grading:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process bulk grading',
        code: 'BULK_GRADING_ERROR'
      }
    });
  }
};

// Helper function to calculate letter grade from percentage
const calculateLetterGrade = (percentage) => {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
};

// @desc    Get student grades for all courses
// @route   GET /api/assignments/student/:studentId/grades
// @access  Private (Student themselves, Teachers of their courses, Admins)
export const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
          code: 'STUDENT_NOT_FOUND'
        }
      });
    }

    // Authorization check
    const isOwnGrades = userId === studentId;
    const isAdmin = userRole === 'Admin';

    // For teachers, check if they teach any courses the student is enrolled in
    let isAuthorizedTeacher = false;
    if (userRole === 'Teacher') {
      const teacherCourses = await Course.find({
        teacher: userId,
        enrolledStudents: studentId
      });
      isAuthorizedTeacher = teacherCourses.length > 0;
    }

    if (!isOwnGrades && !isAdmin && !isAuthorizedTeacher) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Get all submissions for the student with grades
    const submissions = await Submission.find({
      student: studentId,
      grade: { $exists: true, $ne: null }
    })
      .populate({
        path: 'assignment',
        select: 'title pointValue dueDate',
        populate: {
          path: 'course',
          select: 'name'
        }
      })
      .populate('gradedBy', 'name')
      .sort({ gradedAt: -1 });

    // Calculate grade statistics
    const gradeStats = {
      totalAssignments: submissions.length,
      averageGrade: 0,
      averagePercentage: 0,
      totalPointsEarned: 0,
      totalPointsPossible: 0
    };

    if (submissions.length > 0) {
      gradeStats.totalPointsEarned = submissions.reduce((sum, sub) => sum + sub.grade, 0);
      gradeStats.totalPointsPossible = submissions.reduce((sum, sub) => sum + sub.assignment.pointValue, 0);
      gradeStats.averageGrade = gradeStats.totalPointsEarned / submissions.length;
      gradeStats.averagePercentage = (gradeStats.totalPointsEarned / gradeStats.totalPointsPossible) * 100;
    }

    // Group grades by course
    const gradesByCourse = {};
    submissions.forEach(submission => {
      const courseId = submission.assignment.course._id.toString();
      const courseName = submission.assignment.course.name;

      if (!gradesByCourse[courseId]) {
        gradesByCourse[courseId] = {
          courseId,
          courseName,
          assignments: [],
          courseStats: {
            totalAssignments: 0,
            totalPointsEarned: 0,
            totalPointsPossible: 0,
            averagePercentage: 0
          }
        };
      }

      const gradePercentage = (submission.grade / submission.assignment.pointValue) * 100;

      gradesByCourse[courseId].assignments.push({
        assignmentId: submission.assignment._id,
        assignmentTitle: submission.assignment.title,
        grade: submission.grade,
        pointValue: submission.assignment.pointValue,
        percentage: gradePercentage,
        gradedAt: submission.gradedAt,
        gradedBy: submission.gradedBy?.name,
        feedback: submission.feedback,
        isLate: submission.isLate
      });

      gradesByCourse[courseId].courseStats.totalAssignments++;
      gradesByCourse[courseId].courseStats.totalPointsEarned += submission.grade;
      gradesByCourse[courseId].courseStats.totalPointsPossible += submission.assignment.pointValue;
    });

    // Calculate course averages
    Object.values(gradesByCourse).forEach(course => {
      if (course.courseStats.totalPointsPossible > 0) {
        course.courseStats.averagePercentage =
          (course.courseStats.totalPointsEarned / course.courseStats.totalPointsPossible) * 100;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email
        },
        overallStats: gradeStats,
        courseGrades: Object.values(gradesByCourse)
      }
    });
  } catch (error) {
    console.error('Error getting student grades:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve student grades',
        code: 'GRADES_FETCH_ERROR'
      }
    });
  }
};

// @desc    Get gradebook for a course
// @route   GET /api/assignments/course/:courseId/gradebook
// @access  Private (Teachers of course, Admins)
export const getCourseGradebook = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if course exists
    const course = await Course.findById(courseId)
      .populate('enrolledStudents', 'name email')
      .populate('teacher', 'name');

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
    const isTeacher = userRole === 'Teacher' && course.teacher._id.toString() === userId;
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

    // Get all assignments for the course
    const assignments = await Assignment.find({
      course: courseId,
      isActive: true
    }).sort({ dueDate: 1 });

    // Get all submissions for the course
    const submissions = await Submission.find({
      assignment: { $in: assignments.map(a => a._id) }
    })
      .populate('student', 'name email')
      .populate('assignment', 'title pointValue dueDate');

    // Create gradebook structure
    const gradebook = {
      course: {
        id: course._id,
        name: course.name,
        teacher: course.teacher.name
      },
      assignments: assignments.map(assignment => ({
        id: assignment._id,
        title: assignment.title,
        pointValue: assignment.pointValue,
        dueDate: assignment.dueDate
      })),
      students: []
    };

    // Process each student
    course.enrolledStudents.forEach(student => {
      const studentGrades = {
        student: {
          id: student._id,
          name: student.name,
          email: student.email
        },
        assignments: [],
        stats: {
          totalPointsEarned: 0,
          totalPointsPossible: 0,
          averagePercentage: 0,
          submittedCount: 0,
          gradedCount: 0
        }
      };

      // Process each assignment for this student
      assignments.forEach(assignment => {
        const submission = submissions.find(sub =>
          sub.student._id.toString() === student._id.toString() &&
          sub.assignment._id.toString() === assignment._id.toString()
        );

        const assignmentGrade = {
          assignmentId: assignment._id,
          submitted: !!submission,
          submittedAt: submission?.submittedAt,
          isLate: submission?.isLate || false,
          grade: submission?.grade,
          feedback: submission?.feedback,
          gradedAt: submission?.gradedAt,
          percentage: submission?.grade ? (submission.grade / assignment.pointValue) * 100 : null
        };

        studentGrades.assignments.push(assignmentGrade);

        // Update stats
        studentGrades.stats.totalPointsPossible += assignment.pointValue;
        if (submission) {
          studentGrades.stats.submittedCount++;
          if (submission.grade !== undefined && submission.grade !== null) {
            studentGrades.stats.gradedCount++;
            studentGrades.stats.totalPointsEarned += submission.grade;
          }
        }
      });

      // Calculate average percentage
      if (studentGrades.stats.totalPointsPossible > 0) {
        studentGrades.stats.averagePercentage =
          (studentGrades.stats.totalPointsEarned / studentGrades.stats.totalPointsPossible) * 100;
      }

      gradebook.students.push(studentGrades);
    });

    // Calculate course statistics
    const courseStats = {
      totalStudents: gradebook.students.length,
      totalAssignments: assignments.length,
      averageClassGrade: 0,
      submissionRate: 0,
      gradingProgress: 0
    };

    if (gradebook.students.length > 0) {
      const classGrades = gradebook.students
        .map(s => s.stats.averagePercentage)
        .filter(grade => grade > 0);

      if (classGrades.length > 0) {
        courseStats.averageClassGrade = classGrades.reduce((sum, grade) => sum + grade, 0) / classGrades.length;
      }

      const totalPossibleSubmissions = gradebook.students.length * assignments.length;
      const totalSubmissions = gradebook.students.reduce((sum, s) => sum + s.stats.submittedCount, 0);
      const totalGraded = gradebook.students.reduce((sum, s) => sum + s.stats.gradedCount, 0);

      courseStats.submissionRate = totalPossibleSubmissions > 0 ? (totalSubmissions / totalPossibleSubmissions) * 100 : 0;
      courseStats.gradingProgress = totalSubmissions > 0 ? (totalGraded / totalSubmissions) * 100 : 0;
    }

    gradebook.courseStats = courseStats;

    res.status(200).json({
      success: true,
      data: gradebook
    });
  } catch (error) {
    console.error('Error getting course gradebook:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve course gradebook',
        code: 'GRADEBOOK_FETCH_ERROR'
      }
    });
  }
};

// @desc    Get detailed submission information
// @route   GET /api/assignments/submission/:submissionId
// @access  Private (Student who submitted, Teachers of course, Admins)
export const getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const submission = await Submission.findById(submissionId)
      .populate('student', 'name email')
      .populate({
        path: 'assignment',
        select: 'title description pointValue dueDate',
        populate: {
          path: 'course',
          select: 'name teacher'
        }
      })
      .populate('attachments.fileId', 'originalName filename size')
      .populate('gradedBy', 'name email');

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
    const isSubmissionOwner = userRole === 'Student' && submission.student._id.toString() === userId;
    const isTeacher = userRole === 'Teacher' && submission.assignment.course.teacher.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isSubmissionOwner && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        }
      });
    }

    // Calculate additional details
    const submissionDetails = {
      ...submission.toObject(),
      gradePercentage: submission.grade ? (submission.grade / submission.assignment.pointValue) * 100 : null,
      daysLate: submission.isLate ?
        Math.ceil((submission.submittedAt - submission.assignment.dueDate) / (1000 * 60 * 60 * 24)) : 0
    };

    res.status(200).json({
      success: true,
      data: submissionDetails
    });
  } catch (error) {
    console.error('Error getting submission details:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve submission details',
        code: 'SUBMISSION_DETAILS_FETCH_ERROR'
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