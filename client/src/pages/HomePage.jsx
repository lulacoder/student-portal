import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  const getRoleDashboard = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'Student':
        return '/student/dashboard';
      case 'Teacher':
        return '/teacher/dashboard';
      case 'Admin':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to Student Portal System</h1>
        <p>A comprehensive educational management platform for students, teachers, and administrators.</p>
        
        {isAuthenticated ? (
          <div className="authenticated-home">
            <p>Welcome back, {user?.name}!</p>
            <Link to={getRoleDashboard()} className="cta-button">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="unauthenticated-home">
            <div className="cta-buttons">
              <Link to="/login" className="cta-button primary">
                Login
              </Link>
              <Link to="/register" className="cta-button secondary">
                Register
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Course Management</h3>
            <p>Create, manage, and enroll in courses with ease.</p>
          </div>
          <div className="feature-card">
            <h3>Assignment System</h3>
            <p>Submit assignments, receive grades, and track progress.</p>
          </div>
          <div className="feature-card">
            <h3>Secure Authentication</h3>
            <p>Role-based access control for students, teachers, and admins.</p>
          </div>
          <div className="feature-card">
            <h3>File Management</h3>
            <p>Upload and manage course materials and submissions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;