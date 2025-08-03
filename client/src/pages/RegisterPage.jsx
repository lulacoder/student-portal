import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    studentId: '',
    teacherCredentials: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const roleRedirects = {
        'Student': '/student/dashboard',
        'Teacher': '/teacher/dashboard',
        'Admin': '/admin/dashboard'
      };
      const redirectPath = roleRedirects[user.role] || '/';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    setLocalError('');
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    
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
    
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.role) {
      errors.role = 'Please select a role';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      
      // Add role-specific fields
      if (formData.role === 'Student' && formData.studentId) {
        registrationData.studentId = formData.studentId;
      }
      
      if (formData.role === 'Teacher' && formData.teacherCredentials) {
        registrationData.teacherCredentials = formData.teacherCredentials;
      }
      
      const response = await api.post('/auth/register', registrationData);
      const { user, token } = response.data;
      
      login(user, token);
      
      // Redirect based on user role
      const roleRedirects = {
        'Student': '/student/dashboard',
        'Teacher': '/teacher/dashboard',
        'Admin': '/admin/dashboard'
      };
      
      const redirectPath = roleRedirects[user.role] ||  '/';
      navigate(redirectPath, { replace: true });
      
    } catch (error) {
      console.error('Registration error:', error);
      setLocalError(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-form-wrapper">
          <h2>Register for Student Portal</h2>
          
          {localError && (
            <div className="error-message">
              {localError}
            </div>
          )}
          
          {Object.keys(validationErrors).length > 0 && (
            <div className="error-message">
              Please fix the errors below
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="register-form" role="form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
                className={validationErrors.name ? 'error' : ''}
                aria-describedby={validationErrors.name ? 'name-error' : undefined}
              />
              {validationErrors.name && (
                <div id="name-error" className="field-error">
                  {validationErrors.name}
                </div>
              )}
            </div>
            
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
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={isLoading}
                className={validationErrors.role ? 'error' : ''}
                aria-describedby={validationErrors.role ? 'role-error' : undefined}
              >
                <option value="">Select a role</option>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>
              {validationErrors.role && (
                <div id="role-error" className="field-error">
                  {validationErrors.role}
                </div>
              )}
            </div>
            
            {formData.role === 'Student' && (
              <div className="form-group">
                <label htmlFor="studentId">Student ID (Optional)</label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            )}
            
            {formData.role === 'Teacher' && (
              <div className="form-group">
                <label htmlFor="teacherCredentials">Teacher Credentials (Optional)</label>
                <input
                  type="text"
                  id="teacherCredentials"
                  name="teacherCredentials"
                  value={formData.teacherCredentials}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            )}
            
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
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
                className={validationErrors.confirmPassword ? 'error' : ''}
                aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : undefined}
              />
              {validationErrors.confirmPassword && (
                <div id="confirm-password-error" className="field-error">
                  {validationErrors.confirmPassword}
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              className="register-button"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="small" message="" /> : 'Register'}
            </button>
          </form>
          
          <div className="register-footer">
            <p>
              Already have an account? <Link to="/login">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;