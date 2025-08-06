import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourse } from '../services/courseService';
import LoadingSpinner from '../components/LoadingSpinner';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getCourse(courseId);
      setCourse(response.data);
    } catch (err) {
      setError(err.error?.message || err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="course-detail-loading">
        <LoadingSpinner />
        <p>Loading course details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-detail-error">
        <div className="error-message">
          {error}
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/student/courses')}
        >
          Back to Courses
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-detail-not-found">
        <h2>Course not found</h2>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/student/courses')}
        >
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="course-detail">
      <div className="course-detail-header">
        <button 
          className="btn btn-secondary back-button"
          onClick={() => navigate('/student/courses')}
        >
          ← Back to Courses
        </button>
        
        <div className="course-header-info">
          <h1>{course.name}</h1>
          <div className="course-meta">
            <span className="course-subject">{course.subject}</span>
            <span className="course-instructor">
              Instructor: {course.teacher?.name || 'Unknown'}
            </span>
            <span className="course-enrollment">
              {course.enrolledStudents?.length || 0} students enrolled
            </span>
          </div>
        </div>
      </div>

      <div className="course-detail-content">
        <div className="course-section">
          <h2>Course Description</h2>
          <p className="course-description">{course.description}</p>
        </div>

        <div className="course-section">
          <h2>Course Materials</h2>
          {course.materials && course.materials.length > 0 ? (
            <div className="materials-list">
              {course.materials.map((material, index) => (
                <div key={index} className="material-item">
                  <div className="material-info">
                    <span className="material-name">{material.name}</span>
                    <span className="material-date">
                      Uploaded: {new Date(material.uploadDate).toLocaleDateString()}
                    </span>
                  </div>
                  <button className="btn btn-sm btn-primary">
                    Download
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-materials">No course materials available yet.</p>
          )}
        </div>

        <div className="course-section">
          <h2>Assignments</h2>
          <div className="assignments-placeholder">
            <p>Assignment list will be displayed here.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/student/assignments?course=${courseId}`)}
            >
              View All Assignments
            </button>
          </div>
        </div>

        <div className="course-section">
          <h2>Announcements</h2>
          <div className="announcements-placeholder">
            <p>Course announcements will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;