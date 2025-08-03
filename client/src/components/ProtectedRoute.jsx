import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageLoader from './PageLoader';

const ProtectedRoute = ({ children, requiredRole = null, allowedRoles = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return <PageLoader message="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user object exists
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  const hasRequiredRole = () => {
    if (requiredRole) {
      return user.role === requiredRole;
    }
    
    if (allowedRoles && Array.isArray(allowedRoles)) {
      return allowedRoles.includes(user.role);
    }
    
    return true; // No role restrictions
  };

  if (!hasRequiredRole()) {
    // Redirect based on user role
    const roleRedirects = {
      'Student': '/student/dashboard',
      'Teacher': '/teacher/dashboard',
      'Admin': '/admin/dashboard'
    };
    
    const redirectPath = roleRedirects[user.role] || '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;