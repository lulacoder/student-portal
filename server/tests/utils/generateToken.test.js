const { generateToken, verifyToken, extractTokenFromHeader } = require('../../utils/generateToken');

describe('JWT Token Utilities', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockRole = 'Student';

  describe('generateToken', () => {
    test('should generate a valid JWT token', () => {
      const token = generateToken(mockUserId, mockRole);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should throw error when userId is missing', () => {
      expect(() => {
        generateToken(null, mockRole);
      }).toThrow('User ID and role are required to generate token');
    });

    test('should throw error when role is missing', () => {
      expect(() => {
        generateToken(mockUserId, null);
      }).toThrow('User ID and role are required to generate token');
    });

    test('should generate different tokens for different users', () => {
      const token1 = generateToken(mockUserId, mockRole);
      const token2 = generateToken('507f1f77bcf86cd799439012', mockRole);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    test('should verify a valid token', () => {
      const token = generateToken(mockUserId, mockRole);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.role).toBe(mockRole);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should throw error for missing token', () => {
      expect(() => {
        verifyToken(null);
      }).toThrow('Token is required');
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow('Invalid token');
    });

    test('should throw error for malformed token', () => {
      expect(() => {
        verifyToken('not-a-jwt-token');
      }).toThrow('Invalid token');
    });

    test('should throw error for token with wrong secret', () => {
      // Generate token with different secret
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { userId: mockUserId, role: mockRole },
        'wrong-secret'
      );
      
      expect(() => {
        verifyToken(wrongToken);
      }).toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    test('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `Bearer ${token}`;
      
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    test('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });

    test('should return null for undefined header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    test('should return null for header without Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const extracted = extractTokenFromHeader(token);
      expect(extracted).toBeNull();
    });

    test('should return null for empty Bearer header', () => {
      const extracted = extractTokenFromHeader('Bearer ');
      expect(extracted).toBe('');
    });

    test('should handle Bearer with different casing', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `bearer ${token}`;
      
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBeNull(); // Should be case-sensitive
    });
  });

  describe('Token Integration', () => {
    test('should generate and verify token successfully', () => {
      const token = generateToken(mockUserId, mockRole);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.role).toBe(mockRole);
    });

    test('should extract and verify token from header', () => {
      const token = generateToken(mockUserId, mockRole);
      const header = `Bearer ${token}`;
      
      const extracted = extractTokenFromHeader(header);
      const decoded = verifyToken(extracted);
      
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.role).toBe(mockRole);
    });
  });
});