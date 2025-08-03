import request from 'supertest';
import express from 'express';
import courseRoutes from '../../routes/courseRoutes.js';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import { generateToken } from '../../utils/generateToken.js';

const app = express();
app.use(express.json());
app.use('/api/courses', courseRoutes);

describe('Course Controller', () => {
  let studentUser, teacherUser, adminUser, otherTeacherUser;
  let studentToken, teacherToken, adminToken, otherTeacherToken;
  let testCourse;

  beforeEach(async () => {
    // Clear all collections first
    await User.deleteMany({});
    await Course.deleteMany({});
    
    // Create test users
    studentUser = await User.create({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      role: 'Student',
      studentId: 'STU001'
    });

    teacherUser = await User.create({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });

    otherTeacherUser = await User.create({
      name: 'Other Teacher',
      email: 'other.teacher@test.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'MSc in Mathematics'
    });

    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'Admin'
    });

    // Generate tokens
    studentToken = generateToken(studentUser._id, studentUser.role);
    teacherToken = generateToken(teacherUser._id, teacherUser.role);
    otherTeacherToken = generateToken(otherTeacherUser._id, otherTeacherUser.role);
    adminToken = generateToken(adminUser._id, adminUser.role);

    // Create test course
    testCourse = await Course.create({
      name: 'Test Course',
      description: 'This is a test course for unit testing',
      subject: 'Computer Science',
      teacher: teacherUser._id,
      enrolledStudents: [studentUser._id]
    });

    // Add course to student's enrolled courses
    await User.findByIdAndUpdate(
      studentUser._id,
      { $push: { enrolledCourses: testCourse._id } }
    );
  });

  describe('GET /api/courses', () => {
    it('should return enrolled courses for students', async () => {
      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(testCourse._id.toString());
    });

    it('should return teacher courses for teachers', async () => {
      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(testCourse._id.toString());
    });

    it('should return all courses for admins', async () => {
      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/courses');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/courses/available', () => {
    let unenrolledCourse;

    beforeEach(async () => {
      unenrolledCourse = await Course.create({
        name: 'Available Course',
        description: 'Course available for enrollment',
        subject: 'Mathematics',
        teacher: otherTeacherUser._id
      });
    });

    it('should return available courses for students', async () => {
      const response = await request(app)
        .get('/api/courses/available')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(unenrolledCourse._id.toString());
    });

    it('should not allow teachers to access available courses', async () => {
      const response = await request(app)
        .get('/api/courses/available')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should return course details for enrolled student', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCourse._id.toString());
    });

    it('should return course details for course teacher', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCourse._id.toString());
    });

    it('should return course details for admin', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny access to non-enrolled student', async () => {
      const newStudent = await User.create({
        name: 'New Student',
        email: 'new.student@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU002'
      });
      const newStudentToken = generateToken(newStudent._id, newStudent.role);

      const response = await request(app)
        .get(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${newStudentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/courses', () => {
    const validCourseData = {
      name: 'New Course',
      description: 'This is a new course for testing',
      subject: 'Physics'
    };

    it('should create course for teacher', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(validCourseData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validCourseData.name);
      expect(response.body.data.teacher._id).toBe(teacherUser._id.toString());
    });

    it('should create course for admin', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCourseData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should not allow students to create courses', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validCourseData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'Incomplete Course' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/courses/:id', () => {
    const updateData = {
      name: 'Updated Course Name',
      description: 'Updated description'
    };

    it('should allow course teacher to update course', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should allow admin to update any course', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow other teachers to update course', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should not allow students to update courses', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('should allow course teacher to delete course', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify course is soft deleted
      const deletedCourse = await Course.findById(testCourse._id);
      expect(deletedCourse.isActive).toBe(false);
    });

    it('should allow admin to delete any course', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow other teachers to delete course', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should remove course from enrolled students', async () => {
      await request(app)
        .delete(`/api/courses/${testCourse._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      const updatedStudent = await User.findById(studentUser._id);
      expect(updatedStudent.enrolledCourses).not.toContain(testCourse._id);
    });
  });

  describe('POST /api/courses/:id/enroll', () => {
    let unenrolledCourse;

    beforeEach(async () => {
      unenrolledCourse = await Course.create({
        name: 'Enrollment Test Course',
        description: 'Course for testing enrollment',
        subject: 'Biology',
        teacher: teacherUser._id
      });
    });

    it('should allow student to enroll in course', async () => {
      const response = await request(app)
        .post(`/api/courses/${unenrolledCourse._id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify enrollment in database
      const updatedCourse = await Course.findById(unenrolledCourse._id);
      expect(updatedCourse.enrolledStudents.map(id => id.toString())).toContain(studentUser._id.toString());
    });

    it('should not allow duplicate enrollment', async () => {
      // First enrollment
      await request(app)
        .post(`/api/courses/${unenrolledCourse._id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      // Second enrollment attempt
      const response = await request(app)
        .post(`/api/courses/${unenrolledCourse._id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow teachers to enroll', async () => {
      const response = await request(app)
        .post(`/api/courses/${unenrolledCourse._id}/enroll`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/courses/:id/enroll', () => {
    it('should allow student to unenroll from course', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourse._id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify unenrollment in database
      const updatedCourse = await Course.findById(testCourse._id);
      expect(updatedCourse.enrolledStudents).not.toContain(studentUser._id);
    });

    it('should not allow unenrollment from non-enrolled course', async () => {
      const newCourse = await Course.create({
        name: 'Non-enrolled Course',
        description: 'Course student is not enrolled in',
        subject: 'Chemistry',
        teacher: teacherUser._id
      });

      const response = await request(app)
        .delete(`/api/courses/${newCourse._id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow teachers to unenroll', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourse._id}/enroll`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/courses/:id/manage-enrollment', () => {
    let newStudent;

    beforeEach(async () => {
      newStudent = await User.create({
        name: 'New Student',
        email: 'new.student@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU003'
      });
    });

    it('should allow teacher to enroll student', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourse._id}/manage-enrollment`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: newStudent._id,
          action: 'enroll'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify enrollment
      const updatedCourse = await Course.findById(testCourse._id);
      expect(updatedCourse.enrolledStudents.map(id => id.toString())).toContain(newStudent._id.toString());
    });

    it('should allow teacher to unenroll student', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourse._id}/manage-enrollment`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: studentUser._id,
          action: 'unenroll'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify unenrollment
      const updatedCourse = await Course.findById(testCourse._id);
      expect(updatedCourse.enrolledStudents).not.toContain(studentUser._id);
    });

    it('should allow admin to manage enrollment', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourse._id}/manage-enrollment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: newStudent._id,
          action: 'enroll'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow other teachers to manage enrollment', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourse._id}/manage-enrollment`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({
          studentId: newStudent._id,
          action: 'enroll'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate request data', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourse._id}/manage-enrollment`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: newStudent._id,
          action: 'invalid-action'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate student exists', async () => {
      const fakeStudentId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/courses/${testCourse._id}/manage-enrollment`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: fakeStudentId,
          action: 'enroll'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});