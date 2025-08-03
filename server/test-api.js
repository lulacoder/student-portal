const axios = require('axios');
const { generateToken } = require('./utils/generateToken');

// Set environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';

async function testAPI() {
  const baseURL = 'http://localhost:5000/api';
  
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('Health check:', healthResponse.data);

    // Generate test token
    const testUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
    const testToken = generateToken(testUserId, 'Admin');
    console.log('Generated token:', testToken);

    // Test protected endpoint
    console.log('\nTesting protected endpoint...');
    const headers = { Authorization: `Bearer ${testToken}` };
    
    try {
      const usersResponse = await axios.get(`${baseURL}/users`, { headers });
      console.log('Users endpoint response:', usersResponse.data);
    } catch (error) {
      console.log('Users endpoint error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('API test error:', error.message);
  }
}

testAPI();