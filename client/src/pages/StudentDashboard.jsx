import { useAuth } from '../hooks/useAuth';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>My Courses</h3>
            <p>View and manage your enrolled courses</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Enrolled Courses</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Assignments</h3>
            <p>Check upcoming assignments and deadlines</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Pending Assignments</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Grades</h3>
            <p>View your academic progress and grades</p>
            <div className="card-stats">
              <span className="stat-number">-</span>
              <span className="stat-label">Overall GPA</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Announcements</h3>
            <p>Stay updated with course announcements</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">New Announcements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;