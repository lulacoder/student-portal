import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollInCourse, unenrollFromCourse } from '../services/courseService';

const CourseCard = ({ course, isEnrolled = false, onEnrollmentChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEnrollment = async () => {
    setLoading(true);
    setError('');

    try {
      if (isEnrolled) {
        await unenrollFromCourse(course._id);
      } else {
        await enrollInCourse(course._id);
      }
      
      // Notify parent component of enrollment change
      if (onEnrollmentChange) {
        onEnrollmentChange(course._id, !isEnrolled);
      }
    } catch (err) {
      setError(err.error?.message || err.message || 'Enrollment action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourse = () => {
    navigate(`/student/courses/${course._id}`);
  };

  return (
    <div className="course-card">
      <div className="course-card-header">
        <h3 className="course-title">{course.name}</h3>
        <span className="course-subject">{course.subject}</span>
      </div>
      
      <div className="course-card-body">
        <p className="course-description">{course.description}</p>
        
        <div className="course-meta">
          <div className="course-teacher">
            <strong>Instructor:</strong> {course.teacher?.name || 'Unknown'}
          </div>
          {course.enrollmentCount !== undefined && (
            <div className="course-enrollment">
              <strong>Students:</strong> {course.enrollmentCount}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="course-card-actions">
        {isEnrolled ? (
          <>
            <button 
              className="btn btn-primary"
              onClick={handleViewCourse}
            >
              View Course
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleEnrollment}
              disabled={loading}
            >
              {loading ? 'Unenrolling...' : 'Unenroll'}
            </button>
          </>
        ) : (
          <button 
            className="btn btn-primary"
            onClick={handleEnrollment}
            disabled={loading}
          >
            {loading ? 'Enrolling...' : 'Enroll'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseCard;