const { authenticate, authorize, optionalAuth } = require('../../middleware/authMiddleware');
const { generateToken } = require('../../utils/generateToken');
const User = require('../../models/User');
const mongoose = require('mongoose');

// Mock the User model
jest.mock('../../models/User');

// Mock the findById method to return an object with select method
const mockSelect = jest.fn();
const mockFindById = jest.fn(() => ({
    select: mockSelect
}));

describe('Authentication Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {},
            user: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        
        // Setup User model mock
        User.findById = mockFindById;
        
        jest.clearAllMocks();
        mockSelect.mockClear();
        mockFindById.mockClear();
    });

    describe('authenticate middleware', () => {
        it('should authenticate valid token and add user to request', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Test User',
                email: 'test@example.com',
                role: 'Student',
                isActive: true
            };

            const token = generateToken(mockUser._id, mockUser.role);
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(mockUser);

            await authenticate(req, res, next);

            expect(User.findById).toHaveBeenCalledWith(mockUser._id.toString());
            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 401 when no token is provided', async () => {
            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Access denied. No token provided.',
                    code: 'NO_TOKEN'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when token is invalid', async () => {
            req.headers.authorization = 'Bearer invalid-token';

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: expect.any(String),
                    code: 'INVALID_TOKEN'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when user is not found', async () => {
            const mockUserId = new mongoose.Types.ObjectId();
            const token = generateToken(mockUserId, 'Student');
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(null);

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Invalid token. User not found.',
                    code: 'USER_NOT_FOUND'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when user account is deactivated', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Test User',
                email: 'test@example.com',
                role: 'Student',
                isActive: false
            };

            const token = generateToken(mockUser._id, mockUser.role);
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(mockUser);

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Account has been deactivated.',
                    code: 'ACCOUNT_DEACTIVATED'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            const mockUserId = new mongoose.Types.ObjectId();
            const token = generateToken(mockUserId, 'Student');
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockRejectedValue(new Error('Database connection failed'));

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Database connection failed',
                    code: 'INVALID_TOKEN'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('authorize middleware', () => {
        it('should allow access for users with correct role', () => {
            req.user = {
                _id: new mongoose.Types.ObjectId(),
                role: 'Teacher'
            };

            const middleware = authorize('Teacher', 'Admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should allow access for users with any of the specified roles', () => {
            req.user = {
                _id: new mongoose.Types.ObjectId(),
                role: 'Admin'
            };

            const middleware = authorize('Teacher', 'Admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should deny access when user is not authenticated', () => {
            const middleware = authorize('Teacher');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should deny access for users with insufficient permissions', () => {
            req.user = {
                _id: new mongoose.Types.ObjectId(),
                role: 'Student'
            };

            const middleware = authorize('Teacher', 'Admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Access denied. Required role: Teacher or Admin',
                    code: 'INSUFFICIENT_PERMISSIONS'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should work with single role authorization', () => {
            req.user = {
                _id: new mongoose.Types.ObjectId(),
                role: 'Student'
            };

            const middleware = authorize('Student');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('optionalAuth middleware', () => {
        it('should add user to request when valid token is provided', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Test User',
                email: 'test@example.com',
                role: 'Student',
                isActive: true
            };

            const token = generateToken(mockUser._id, mockUser.role);
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(mockUser);

            await optionalAuth(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should continue without authentication when no token is provided', async () => {
            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(User.findById).not.toHaveBeenCalled();
        });

        it('should continue without authentication when token is invalid', async () => {
            req.headers.authorization = 'Bearer invalid-token';

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should continue without authentication when user is not found', async () => {
            const mockUserId = new mongoose.Types.ObjectId();
            const token = generateToken(mockUserId, 'Student');
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(null);

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should continue without authentication when user is deactivated', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Test User',
                email: 'test@example.com',
                role: 'Student',
                isActive: false
            };

            const token = generateToken(mockUser._id, mockUser.role);
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(mockUser);

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            const mockUserId = new mongoose.Types.ObjectId();
            const token = generateToken(mockUserId, 'Student');
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockRejectedValue(new Error('Database connection failed'));

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Integration scenarios', () => {
        it('should work with authenticate followed by authorize', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Test Teacher',
                email: 'teacher@example.com',
                role: 'Teacher',
                isActive: true
            };

            const token = generateToken(mockUser._id, mockUser.role);
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(mockUser);

            // First authenticate
            await authenticate(req, res, next);
            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalledTimes(1);

            // Reset next mock for authorize test
            next.mockClear();

            // Then authorize
            const authorizeMiddleware = authorize('Teacher', 'Admin');
            authorizeMiddleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should handle authorization failure after successful authentication', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Test Student',
                email: 'student@example.com',
                role: 'Student',
                isActive: true
            };

            const token = generateToken(mockUser._id, mockUser.role);
            req.headers.authorization = `Bearer ${token}`;

            mockSelect.mockResolvedValue(mockUser);

            // First authenticate
            await authenticate(req, res, next);
            expect(req.user).toEqual(mockUser);

            // Reset mocks for authorize test
            next.mockClear();
            res.status.mockClear();
            res.json.mockClear();

            // Then try to authorize for Teacher role (should fail)
            const authorizeMiddleware = authorize('Teacher');
            authorizeMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Access denied. Required role: Teacher',
                    code: 'INSUFFICIENT_PERMISSIONS'
                }
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});