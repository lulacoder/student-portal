import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NotFoundPage = () => {
  const { isAuthenticated, user } = useAuth();

  const getHomeLink = () => {
    if (!isAuthenticated) return '/';
    
    switch (user?.role) {
      case 'Student':
        return '/student/dashboard';
      case 'Teacher':
        return '/teacher/dashboard';
      case 'Admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to={getHomeLink()} className="cta-button primary">
            Go Home
          </Link>
          <button onClick={() => window.history.back()} className="cta-button secondary">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;