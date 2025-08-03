import { useAuth } from '../hooks/useAuth';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Users</h3>
            <p>Manage students, teachers, and administrators</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Total Users</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Courses</h3>
            <p>Oversee all courses in the system</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Total Courses</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>System Activity</h3>
            <p>Monitor platform usage and activity</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Active Sessions</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Announcements</h3>
            <p>Manage global system announcements</p>
            <div className="card-stats">
              <span className="stat-number">0</span>
              <span className="stat-label">Global Announcements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;