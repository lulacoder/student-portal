import { useAuth } from '../hooks/useAuth';

const TeacherDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>My Courses</h3>
            <p>Manage your teaching courses</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Active Courses</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Students</h3>
            <p>View enrolled students across all courses</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Total Students</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Assignments</h3>
            <p>Create and manage course assignments</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Active Assignments</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Submissions</h3>
            <p>Review and grade student submissions</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Pending Reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;