import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBasedLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case 'Student':
        return [
          { to: '/student/dashboard', label: 'Dashboard' },
          { to: '/student/courses', label: 'My Courses' },
          { to: '/student/assignments', label: 'Assignments' },
          { to: '/student/grades', label: 'Grades' }
        ];
      case 'Teacher':
        return [
          { to: '/teacher/dashboard', label: 'Dashboard' },
          { to: '/teacher/courses', label: 'My Courses' },
          { to: '/teacher/assignments', label: 'Assignments' },
          { to: '/teacher/grades', label: 'Gradebook' }
        ];
      case 'Admin':
        return [
          { to: '/admin/dashboard', label: 'Dashboard' },
          { to: '/admin/users', label: 'Users' },
          { to: '/admin/courses', label: 'Courses' },
          { to: '/admin/announcements', label: 'Announcements' }
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Student Portal
        </Link>

        {isAuthenticated ? (
          <div className="navbar-content">
            <ul className="navbar-nav">
              {getRoleBasedLinks().map((link) => (
                <li key={link.to} className="nav-item">
                  <Link to={link.to} className="nav-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="navbar-user">
              <span className="user-info">
                Welcome, {user?.name} ({user?.role})
              </span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="nav-link">
              Login
            </Link>
            <Link to="/register" className="nav-link">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;