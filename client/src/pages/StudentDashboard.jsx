import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getEnrolledCourses } from '../services/courseService';
import LoadingSpinner from '../components/LoadingSpinner';
import AssignmentProgress from '../components/AssignmentProgress';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getEnrolledCourses();
      setCourses(response.data || []);
    } catch (err) {
      setError(err.error?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <LoadingSpinner />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="dashboard-content">
        <AssignmentProgress />
        
        <div className="dashboard-grid">
          <div className="dashboard-card clickable" onClick={() => navigate('/student/courses')}>
            <h3>My Courses</h3>
            <p>View and manage your enrolled courses</p>
            <div className="card-stats">
              <span className="stat-number">{courses.length}</span>
              <span className="stat-label">Enrolled Courses</span>
            </div>
            <div className="card-action">
              <button className="btn btn-sm btn-primary">View Courses</button>
            </div>
          </div>
          
          <div className="dashboard-card clickable" onClick={() => navigate('/student/assignments')}>
            <h3>Assignments</h3>
            <p>Check upcoming assignments and deadlines</p>
            <div className="card-stats">
              <span className="stat-number">-</span>
              <span className="stat-label">Pending Assignments</span>
            </div>
            <div className="card-action">
              <button className="btn btn-sm btn-primary">View Assignments</button>
            </div>
          </div>
          
          <div className="dashboard-card clickable" onClick={() => navigate('/student/grades')}>
            <h3>Grades</h3>
            <p>View your academic progress and grades</p>
            <div className="card-stats">
              <span className="stat-number">-</span>
              <span className="stat-label">Overall GPA</span>
            </div>
            <div className="card-action">
              <button className="btn btn-sm btn-primary">View Grades</button>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Announcements</h3>
            <p>Stay updated with course announcements</p>
            <div className="card-stats">
              <span className="stat-number">-</span>
              <span className="stat-label">New Announcements</span>
            </div>
          </div>
        </div>

        {courses.length > 0 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Courses</h2>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/student/courses')}
              >
                View All
              </button>
            </div>
            <div className="recent-courses">
              {courses.slice(0, 3).map(course => (
                <div 
                  key={course._id} 
                  className="recent-course-card"
                  onClick={() => navigate(`/student/courses/${course._id}`)}
                >
                  <h4>{course.name}</h4>
                  <p>{course.subject}</p>
                  <span className="instructor">
                    {course.teacher?.name || 'Unknown Instructor'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {courses.length === 0 && !loading && (
          <div className="dashboard-section">
            <div className="empty-state">
              <h3>Get Started</h3>
              <p>You haven't enrolled in any courses yet. Browse our course catalog to find courses that interest you!</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/student/catalog')}
              >
                Browse Course Catalog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;