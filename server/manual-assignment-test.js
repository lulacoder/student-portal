import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000/api';

// Test data
let teacherToken, studentToken, courseId, assignmentId, submissionId;

async function runTests() {
  try {
    console.log('🚀 Starting Assignment System Manual Tests\n');

    // Step 1: Login as teacher
    console.log('1. Logging in as teacher...');
    const teacherLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'teacher@test.com',
      password: 'password123'
    });
    teacherToken = teacherLogin.data.token;
    console.log('✅ Teacher logged in successfully\n');

    // Step 2: Login as student
    console.log('2. Logging in as student...');
    const studentLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'student@test.com',
      password: 'password123'
    });
    studentToken = studentLogin.data.token;
    console.log('✅ Student logged in successfully\n');

    // Step 3: Get courses (assuming there's at least one)
    console.log('3. Getting courses...');
    const coursesResponse = await axios.get(`${API_BASE}/courses`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    courseId = coursesResponse.data.data[0]._id;
    console.log(`✅ Found course: ${coursesResponse.data.data[0].name}\n`);

    // Step 4: Create assignment
    console.log('4. Creating assignment...');
    const assignmentData = {
      title: 'Manual Test Assignment',
      description: 'This is a test assignment created via manual testing',
      course: courseId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      pointValue: 100
    };

    const assignmentResponse = await axios.post(`${API_BASE}/assignments`, assignmentData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assignmentId = assignmentResponse.data.data._id;
    console.log(`✅ Assignment created: ${assignmentResponse.data.data.title}\n`);

    // Step 5: Get assignments for course (as teacher)
    console.log('5. Getting assignments as teacher...');
    const teacherAssignments = await axios.get(`${API_BASE}/assignments/course/${courseId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`✅ Found ${teacherAssignments.data.data.length} assignments\n`);

    // Step 6: Get assignments for course (as student)
    console.log('6. Getting assignments as student...');
    const studentAssignments = await axios.get(`${API_BASE}/assignments/course/${courseId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log(`✅ Student sees ${studentAssignments.data.data.length} assignments\n`);

    // Step 7: Submit assignment
    console.log('7. Submitting assignment as student...');
    const submissionData = {
      submissionText: 'This is my test submission for the manual test assignment.'
    };

    const submissionResponse = await axios.post(`${API_BASE}/assignments/${assignmentId}/submit`, submissionData, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    submissionId = submissionResponse.data.data._id;
    console.log(`✅ Assignment submitted successfully\n`);

    // Step 8: Get submissions (as teacher)
    console.log('8. Getting submissions as teacher...');
    const submissions = await axios.get(`${API_BASE}/assignments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`✅ Found ${submissions.data.data.length} submissions\n`);

    // Step 9: Grade submission
    console.log('9. Grading submission...');
    const gradeData = {
      grade: 85,
      feedback: 'Good work! Well structured submission.'
    };

    const gradeResponse = await axios.put(`${API_BASE}/assignments/submission/${submissionId}/grade`, gradeData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`✅ Submission graded: ${gradeResponse.data.data.grade}/100\n`);

    // Step 10: Test file upload (create test file first)
    console.log('10. Testing file upload...');
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for assignment upload.');

    const formData = new FormData();
    formData.append('title', 'Assignment with File');
    formData.append('description', 'Assignment that includes a file attachment');
    formData.append('course', courseId);
    formData.append('dueDate', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
    formData.append('pointValue', '50');
    formData.append('files', fs.createReadStream(testFilePath));

    const fileAssignmentResponse = await axios.post(`${API_BASE}/assignments`, formData, {
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        ...formData.getHeaders()
      }
    });

    console.log(`✅ Assignment with file created: ${fileAssignmentResponse.data.data.attachments.length} attachments\n`);

    // Clean up test file
    fs.unlinkSync(testFilePath);

    console.log('🎉 All manual tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Clean up test file if it exists
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Check if server is running before starting tests
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/health`);
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first with: npm run dev\n');
    return false;
  }
}

// Run the tests
checkServer().then(serverRunning => {
  if (serverRunning) {
    runTests();
  }
});