const request = require('supertest');
const express = require('express');
const { register, login, getProfile, updateProfile } = require('../../controllers/authController');
const { authenticate } = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const { generateToken } = require('../../utils/generateToken');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/generateToken');

// Create express app for testing
const app = express();
app.use(express.json());

// Setup routes
app.post('/register', register);
app.post('/login', login);
app.get('/profile', authenticate, getProfile);
app.put('/profile', authenticate, updateProfile);

describe('Auth Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /register', () => {
        it('should register a new student successfully', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                role: 'Student',
                studentId: 'STU001'
            };

            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                ...userData,
                toSafeObject: jest.fn().mockReturnValue({
                    _id: new mongoose.Types.ObjectId(),
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    studentId: userData.studentId
                }),
                save: jest.fn().mockResolvedValue(true)
            };

            User.findOne.mockResolvedValue(null); // No existing user
            User.mockImplementation(() => mockUser);
            generateToken.mockReturnValue('mock-jwt-token');

            const response = await request(app)
                .post('/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBe('mock-jwt-token');
            expect(response.body.message).toBe('User registered successfully');
            expect(User.findOne).toHaveBeenCalledWith({ email: userData.email.toLowerCase() });
            expect(generateToken).toHaveBeenCalledWith(mockUser._id.toString(), userData.role);
        });

        it('should register a new teacher successfully', async () => {
            const userData = {
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: 'password123',
                role: 'Teacher',
                teacherCredentials: 'PhD in Computer Science'
            };

            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                ...userData,
                toSafeObject: jest.fn().mockReturnValue({
                    _id: new mongoose.Types.ObjectId(),
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    teacherCredentials: userData.teacherCredentials
                }),
                save: jest.fn().mockResolvedValue(true)
            };

            User.findOne.mockResolvedValue(null);
            User.mockImplementation(() => mockUser);
            generateToken.mockReturnValue('mock-jwt-token');

            const response = await request(app)
                .post('/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBe('mock-jwt-token');
        });

        it('should return 400 when required fields are missing', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com'
                    // Missing password and role
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
        });

        it('should return 400 when role is invalid', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    role: 'Admin' // Invalid role for registration
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_ROLE');
        });

        it('should return 400 when student ID is missing for student', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    role: 'Student'
                    // Missing studentId
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_STUDENT_ID');
        });

        it('should return 400 when teacher credentials are missing for teacher', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    password: 'password123',
                    role: 'Teacher'
                    // Missing teacherCredentials
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_TEACHER_CREDENTIALS');
        });

        it('should return 409 when email already exists', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                role: 'Student',
                studentId: 'STU001'
            };

            User.findOne.mockResolvedValue({ email: userData.email }); // Existing user

            const response = await request(app)
                .post('/register')
                .send(userData);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
        });

        it('should return 409 when student ID already exists', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                role: 'Student',
                studentId: 'STU001'
            };

            User.findOne
                .mockResolvedValueOnce(null) // No existing email
                .mockResolvedValueOnce({ studentId: userData.studentId }); // Existing student ID

            const response = await request(app)
                .post('/register')
                .send(userData);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('STUDENT_ID_EXISTS');
        });
    });

    describe('POST /login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'password123'
            };

            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                email: loginData.email,
                role: 'Student',
                isActive: true,
                comparePassword: jest.fn().mockResolvedValue(true),
                toSafeObject: jest.fn().mockReturnValue({
                    _id: new mongoose.Types.ObjectId(),
                    name: 'John Doe',
                    email: loginData.email,
                    role: 'Student'
                })
            };

            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });
            generateToken.mockReturnValue('mock-jwt-token');

            const response = await request(app)
                .post('/login')
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBe('mock-jwt-token');
            expect(response.body.message).toBe('Login successful');
            expect(mockUser.comparePassword).toHaveBeenCalledWith(loginData.password);
        });

        it('should return 400 when credentials are missing', async () => {
            const response = await request(app)
                .post('/login')
                .send({
                    email: 'john@example.com'
                    // Missing password
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
        });

        it('should return 401 when user does not exist', async () => {
            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
        });

        it('should return 401 when account is deactivated', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                email: 'john@example.com',
                isActive: false
            };

            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'john@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
        });

        it('should return 401 when password is invalid', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                email: 'john@example.com',
                isActive: true,
                comparePassword: jest.fn().mockResolvedValue(false)
            };

            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'john@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
        });
    });

    describe('GET /profile', () => {
        it('should get user profile successfully', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'John Doe',
                email: 'john@example.com',
                role: 'Student',
                toSafeObject: jest.fn().mockReturnValue({
                    _id: new mongoose.Types.ObjectId(),
                    name: 'John Doe',
                    email: 'john@example.com',
                    role: 'Student'
                })
            };

            // Mock the authenticate middleware to add user to request
            const mockAuthenticate = (req, res, next) => {
                req.user = { _id: mockUser._id };
                next();
            };

            // Create a new app instance with mocked middleware
            const testApp = express();
            testApp.use(express.json());
            testApp.get('/profile', mockAuthenticate, getProfile);

            User.findById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser)
                })
            });

            const response = await request(testApp)
                .get('/profile');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
        });

        it('should return 404 when user not found', async () => {
            const mockAuthenticate = (req, res, next) => {
                req.user = { _id: new mongoose.Types.ObjectId() };
                next();
            };

            const testApp = express();
            testApp.use(express.json());
            testApp.get('/profile', mockAuthenticate, getProfile);

            User.findById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(null)
                })
            });

            const response = await request(testApp)
                .get('/profile');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('USER_NOT_FOUND');
        });
    });

    describe('PUT /profile', () => {
        it('should update user profile successfully', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'John Doe',
                email: 'john@example.com',
                role: 'Student',
                studentId: 'STU001',
                save: jest.fn().mockResolvedValue(true),
                toSafeObject: jest.fn().mockReturnValue({
                    _id: new mongoose.Types.ObjectId(),
                    name: 'John Updated',
                    email: 'john@example.com',
                    role: 'Student',
                    studentId: 'STU002'
                })
            };

            const mockAuthenticate = (req, res, next) => {
                req.user = { _id: mockUser._id };
                next();
            };

            const testApp = express();
            testApp.use(express.json());
            testApp.put('/profile', mockAuthenticate, updateProfile);

            User.findById.mockResolvedValue(mockUser);
            User.findOne.mockResolvedValue(null); // No existing student with new ID

            const response = await request(testApp)
                .put('/profile')
                .send({
                    name: 'John Updated',
                    studentId: 'STU002'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Profile updated successfully');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should return 409 when student ID is already taken', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                role: 'Student',
                studentId: 'STU001'
            };

            const mockAuthenticate = (req, res, next) => {
                req.user = { _id: mockUser._id };
                next();
            };

            const testApp = express();
            testApp.use(express.json());
            testApp.put('/profile', mockAuthenticate, updateProfile);

            User.findById.mockResolvedValue(mockUser);
            User.findOne.mockResolvedValue({ studentId: 'STU002' }); // Existing student with new ID

            const response = await request(testApp)
                .put('/profile')
                .send({
                    studentId: 'STU002'
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('STUDENT_ID_EXISTS');
        });
    });
});