import { useReducer, useEffect } from 'react';
import { AuthContext } from './AuthContext';

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          const parsedUser = JSON.parse(user);
          
          // Validate token format (basic check)
          if (token.split('.').length === 3) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: parsedUser,
                token: token
              }
            });
          } else {
            throw new Error('Invalid token format');
          }
        } catch (error) {
          console.warn('Invalid stored authentication data:', error);
          // Invalid stored data, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    initializeAuth();
  }, []);

  const login = (userData, token) => {
    try {
      // Validate inputs
      if (!userData || !token) {
        throw new Error('Invalid login data');
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: userData,
          token: token
        }
      });
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please try again.');
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if localStorage fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: 'LOGIN_FAILURE', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    logout,
    setLoading,
    setError,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};