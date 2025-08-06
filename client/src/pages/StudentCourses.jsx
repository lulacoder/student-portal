import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEnrolledCourses } from '../services/courseService';
import CourseList from '../components/CourseList';

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getEnrolledCourses();
      setCourses(response.data || []);
    } catch (err) {
      setError(err.error?.message || err.message || 'Failed to load enrolled courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentChange = (courseId, enrolled) => {
    if (!enrolled) {
      // Remove course from enrolled courses when unenrolled
      setCourses(prev => prev.filter(course => course._id !== courseId));
    }
  };

  return (
    <div className="student-courses">
      <div className="page-header">
        <h1>My Courses</h1>
        <p>Manage your enrolled courses</p>
        
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/student/catalog')}
          >
            Browse Course Catalog
          </button>
        </div>
      </div>

      <div className="courses-stats">
        <div className="stat-card">
          <div className="stat-number">{courses.length}</div>
          <div className="stat-label">Enrolled Courses</div>
        </div>
      </div>

      <CourseList
        courses={courses}
        loading={loading}
        error={error}
        isEnrolledView={true}
        onEnrollmentChange={handleEnrollmentChange}
        emptyMessage="You are not enrolled in any courses yet. Browse the course catalog to get started!"
      />
    </div>
  );
};

export default StudentCourses;