import Course from '../models/Course.js';
import User from '../models/User.js';

/**
 * Get all courses with role-based filtering
 * Students: Only enrolled courses
 * Teachers: Only their courses
 * Admins: All courses
 */
const getCourses = async (req, res) => {
    try {
        let query = { isActive: true };
        let courses;

        switch (req.user.role) {
            case 'Student':
                // Students see only courses they're enrolled in
                courses = await Course.find({
                    ...query,
                    enrolledStudents: req.user._id
                })
                    .populate('teacher', 'name email')
                    .populate('enrolledStudents', 'name email studentId')
                    .sort({ createdAt: -1 });
                break;

            case 'Teacher':
                // Teachers see only their courses
                courses = await Course.find({
                    ...query,
                    teacher: req.user._id
                })
                    .populate('teacher', 'name email')
                    .populate('enrolledStudents', 'name email studentId')
                    .sort({ createdAt: -1 });
                break;

            case 'Admin':
                // Admins see all courses
                courses = await Course.find(query)
                    .populate('teacher', 'name email')
                    .populate('enrolledStudents', 'name email studentId')
                    .sort({ createdAt: -1 });
                break;

            default:
                return res.status(403).json({
                    success: false,
                    error: {
                        message: 'Invalid user role',
                        code: 'INVALID_ROLE'
                    }
                });
        }

        res.status(200).json({
            success: true,
            data: courses,
            count: courses.length
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to retrieve courses',
                code: 'COURSES_FETCH_ERROR'
            }
        });
    }
};

/**
 * Get available courses for enrollment (Students only)
 */
const getAvailableCourses = async (req, res) => {
    try {
        if (req.user.role !== 'Student') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Only students can view available courses',
                    code: 'STUDENTS_ONLY'
                }
            });
        }

        // Find courses where student is not enrolled
        const courses = await Course.find({
            isActive: true,
            enrolledStudents: { $ne: req.user._id }
        })
            .populate('teacher', 'name email')
            .select('-enrolledStudents') // Don't include enrolled students list
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: courses,
            count: courses.length
        });
    } catch (error) {
        console.error('Get available courses error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to retrieve available courses',
                code: 'AVAILABLE_COURSES_FETCH_ERROR'
            }
        });
    }
};

/**
 * Get single course by ID
 */
const getCourse = async (req, res) => {
    try {
        const { id } = req.params;

        // First get course without population to check access
        const courseForAccess = await Course.findById(id);

        if (!courseForAccess) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Course not found',
                    code: 'COURSE_NOT_FOUND'
                }
            });
        }

        // Check access permissions using unpopulated course
        const hasAccess =
            req.user.role === 'Admin' ||
            courseForAccess.teacher.toString() === req.user._id.toString() ||
            (req.user.role === 'Student' && courseForAccess.isStudentEnrolled(req.user._id));

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Access denied to this course',
                    code: 'COURSE_ACCESS_DENIED'
                }
            });
        }

        // Now get the populated course for response
        const course = await Course.findById(id)
            .populate('teacher', 'name email')
            .populate('enrolledStudents', 'name email studentId');

        res.status(200).json({
            success: true,
            data: course
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to retrieve course',
                code: 'COURSE_FETCH_ERROR'
            }
        });
    }
};

/**
 * Create new course (Teachers and Admins only)
 */
const createCourse = async (req, res) => {
    try {
        const { name, description, subject } = req.body;

        // Validation
        if (!name || !description || !subject) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Name, description, and subject are required',
                    code: 'MISSING_REQUIRED_FIELDS'
                }
            });
        }

        // Create course with current user as teacher
        const course = new Course({
            name: name.trim(),
            description: description.trim(),
            subject: subject.trim(),
            teacher: req.user._id
        });

        await course.save();

        // Populate teacher info for response
        await course.populate('teacher', 'name email');

        res.status(201).json({
            success: true,
            data: course,
            message: 'Course created successfully'
        });
    } catch (error) {
        console.error('Create course error:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: {
                    message: Object.values(error.errors)[0].message,
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to create course',
                code: 'COURSE_CREATE_ERROR'
            }
        });
    }
};

/**
 * Update course (Course teacher and Admins only)
 */
const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, subject } = req.body;

        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Course not found',
                    code: 'COURSE_NOT_FOUND'
                }
            });
        }

        // Check permissions - only course teacher or admin can update
        const canUpdate =
            req.user.role === 'Admin' ||
            course.teacher.toString() === req.user._id.toString();

        if (!canUpdate) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Only the course teacher or admin can update this course',
                    code: 'UPDATE_PERMISSION_DENIED'
                }
            });
        }

        // Update fields if provided
        if (name) course.name = name.trim();
        if (description) course.description = description.trim();
        if (subject) course.subject = subject.trim();

        await course.save();
        await course.populate('teacher', 'name email');
        await course.populate('enrolledStudents', 'name email studentId');

        res.status(200).json({
            success: true,
            data: course,
            message: 'Course updated successfully'
        });
    } catch (error) {
        console.error('Update course error:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: {
                    message: Object.values(error.errors)[0].message,
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update course',
                code: 'COURSE_UPDATE_ERROR'
            }
        });
    }
};

/**
 * Delete course (Course teacher and Admins only)
 */
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Course not found',
                    code: 'COURSE_NOT_FOUND'
                }
            });
        }

        // Check permissions - only course teacher or admin can delete
        const canDelete =
            req.user.role === 'Admin' ||
            course.teacher.toString() === req.user._id.toString();

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Only the course teacher or admin can delete this course',
                    code: 'DELETE_PERMISSION_DENIED'
                }
            });
        }

        // Soft delete by setting isActive to false
        course.isActive = false;
        await course.save();

        // Remove course from enrolled students' enrolledCourses array
        await User.updateMany(
            { enrolledCourses: course._id },
            { $pull: { enrolledCourses: course._id } }
        );

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to delete course',
                code: 'COURSE_DELETE_ERROR'
            }
        });
    }
};

/**
 * Enroll student in course
 */
const enrollInCourse = async (req, res) => {
    try {
        const { id } = req.params;

        // Only students can enroll
        if (req.user.role !== 'Student') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Only students can enroll in courses',
                    code: 'STUDENTS_ONLY'
                }
            });
        }

        const course = await Course.findById(id);

        if (!course || !course.isActive) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Course not found or inactive',
                    code: 'COURSE_NOT_FOUND'
                }
            });
        }

        // Check if already enrolled
        if (course.isStudentEnrolled(req.user._id)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Already enrolled in this course',
                    code: 'ALREADY_ENROLLED'
                }
            });
        }

        // Enroll student
        course.enrollStudent(req.user._id);
        await course.save();

        // Add course to user's enrolledCourses
        await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { enrolledCourses: course._id } }
        );

        await course.populate('teacher', 'name email');

        res.status(200).json({
            success: true,
            data: course,
            message: 'Successfully enrolled in course'
        });
    } catch (error) {
        console.error('Enroll in course error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to enroll in course',
                code: 'ENROLLMENT_ERROR'
            }
        });
    }
};

/**
 * Unenroll student from course
 */
const unenrollFromCourse = async (req, res) => {
    try {
        const { id } = req.params;

        // Only students can unenroll themselves
        if (req.user.role !== 'Student') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Only students can unenroll from courses',
                    code: 'STUDENTS_ONLY'
                }
            });
        }

        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Course not found',
                    code: 'COURSE_NOT_FOUND'
                }
            });
        }

        // Check if enrolled
        if (!course.isStudentEnrolled(req.user._id)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Not enrolled in this course',
                    code: 'NOT_ENROLLED'
                }
            });
        }

        // Unenroll student
        course.unenrollStudent(req.user._id);
        await course.save();

        // Remove course from user's enrolledCourses
        await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { enrolledCourses: course._id } }
        );

        res.status(200).json({
            success: true,
            message: 'Successfully unenrolled from course'
        });
    } catch (error) {
        console.error('Unenroll from course error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to unenroll from course',
                code: 'UNENROLLMENT_ERROR'
            }
        });
    }
};

/**
 * Manage student enrollment (Teachers and Admins only)
 * Can enroll or unenroll specific students
 */
const manageEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, action } = req.body;

        if (!studentId || !action || !['enroll', 'unenroll'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Student ID and valid action (enroll/unenroll) are required',
                    code: 'INVALID_REQUEST'
                }
            });
        }

        const course = await Course.findById(id);

        if (!course || !course.isActive) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Course not found or inactive',
                    code: 'COURSE_NOT_FOUND'
                }
            });
        }

        // Check permissions - only course teacher or admin
        const canManage =
            req.user.role === 'Admin' ||
            course.teacher.toString() === req.user._id.toString();

        if (!canManage) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Only the course teacher or admin can manage enrollment',
                    code: 'MANAGE_PERMISSION_DENIED'
                }
            });
        }

        // Verify student exists and is a student
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

        if (action === 'enroll') {
            if (course.isStudentEnrolled(studentId)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Student is already enrolled',
                        code: 'ALREADY_ENROLLED'
                    }
                });
            }

            course.enrollStudent(studentId);
            await User.findByIdAndUpdate(
                studentId,
                { $addToSet: { enrolledCourses: course._id } }
            );
        } else {
            if (!course.isStudentEnrolled(studentId)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Student is not enrolled',
                        code: 'NOT_ENROLLED'
                    }
                });
            }

            course.unenrollStudent(studentId);
            await User.findByIdAndUpdate(
                studentId,
                { $pull: { enrolledCourses: course._id } }
            );
        }

        await course.save();
        await course.populate('enrolledStudents', 'name email studentId');

        res.status(200).json({
            success: true,
            data: course,
            message: `Student ${action}ed successfully`
        });
    } catch (error) {
        console.error('Manage enrollment error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to manage enrollment',
                code: 'ENROLLMENT_MANAGEMENT_ERROR'
            }
        });
    }
};

export {
    getCourses,
    getAvailableCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse,
    manageEnrollment
};