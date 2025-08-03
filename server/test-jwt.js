const { generateToken, verifyToken } = require('./utils/generateToken');

// Set environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';

console.log('JWT_SECRET:', process.env.JWT_SECRET);

try {
  // Test token generation
  const testUserId = '507f1f77bcf86cd799439011';
  const testRole = 'Admin';
  
  console.log('Generating token...');
  const token = generateToken(testUserId, testRole);
  console.log('Generated token:', token);
  
  // Test token verification
  console.log('Verifying token...');
  const decoded = verifyToken(token);
  console.log('Decoded token:', decoded);
  
  console.log('JWT test successful!');
} catch (error) {
  console.error('JWT test failed:', error.message);
}