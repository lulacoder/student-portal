import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  const { login, error, clearError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const roleRedirects = {
        'Student': '/student/dashboard',
        'Teacher': '/teacher/dashboard',
        'Admin': '/admin/dashboard'
      };
      const redirectPath = roleRedirects[user.role] || from;
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    setLocalError('');
    clearError();
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setLocalError('');
    
    try {
      const response = await api.post('/auth/login', formData);
      const { user, token } = response.data;
      
      login(user, token);
      
      // Redirect based on user role
      const roleRedirects = {
        'Student': '/student/dashboard',
        'Teacher': '/teacher/dashboard',
        'Admin': '/admin/dashboard'
      };
      
      const redirectPath = roleRedirects[user.role] || from;
      navigate(redirectPath, { replace: true });
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-form-wrapper">
          <h2>Login to Student Portal</h2>
          
          {(error || localError) && (
            <div className="error-message">
              {error || localError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form" role="form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className={validationErrors.email ? 'error' : ''}
                aria-describedby={validationErrors.email ? 'email-error' : undefined}
              />
              {validationErrors.email && (
                <div id="email-error" className="field-error">
                  {validationErrors.email}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                className={validationErrors.password ? 'error' : ''}
                aria-describedby={validationErrors.password ? 'password-error' : undefined}
              />
              {validationErrors.password && (
                <div id="password-error" className="field-error">
                  {validationErrors.password}
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="small" message="" /> : 'Login'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;