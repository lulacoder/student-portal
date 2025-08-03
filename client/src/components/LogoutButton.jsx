import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LogoutButton = ({ className = '', children = 'Logout' }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if logout fails
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`logout-btn ${className}`}
      aria-label="Logout from application"
    >
      {isLoggingOut ? 'Logging out...' : children}
    </button>
  );
};

export default LogoutButton;