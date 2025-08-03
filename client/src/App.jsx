import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';

import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              
              {/* Protected Student routes */}
              <Route path="student/*" element={
                <ProtectedRoute requiredRole="Student">
                  <Routes>
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="courses" element={<div>Student Courses (Coming Soon)</div>} />
                    <Route path="assignments" element={<div>Student Assignments (Coming Soon)</div>} />
                    <Route path="grades" element={<div>Student Grades (Coming Soon)</div>} />
                    <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              } />
              
              {/* Protected Teacher routes */}
              <Route path="teacher/*" element={
                <ProtectedRoute requiredRole="Teacher">
                  <Routes>
                    <Route path="dashboard" element={<TeacherDashboard />} />
                    <Route path="courses" element={<div>Teacher Courses (Coming Soon)</div>} />
                    <Route path="assignments" element={<div>Teacher Assignments (Coming Soon)</div>} />
                    <Route path="grades" element={<div>Teacher Gradebook (Coming Soon)</div>} />
                    <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              } />
              
              {/* Protected Admin routes */}
              <Route path="admin/*" element={
                <ProtectedRoute requiredRole="Admin">
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<div>Admin Users (Coming Soon)</div>} />
                    <Route path="courses" element={<div>Admin Courses (Coming Soon)</div>} />
                    <Route path="announcements" element={<div>Admin Announcements (Coming Soon)</div>} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              } />
              
              {/* 404 route */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App
