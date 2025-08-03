import { useState } from 'react';
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
    role: 'Student',
    studentId: '',
    teacherCredentials: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setLocalError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return false;
    }
    
    return true;
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
          
          <form onSubmit={handleSubmit} className="register-form">
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
              />
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
              />
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
              >
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>
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
              />
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
              />
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