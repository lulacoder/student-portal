import CourseCard from './CourseCard';
import LoadingSpinner from './LoadingSpinner';

const CourseList = ({ 
  courses, 
  loading, 
  error, 
  isEnrolledView = false, 
  onEnrollmentChange,
  emptyMessage = "No courses available"
}) => {
  if (loading) {
    return (
      <div className="course-list-loading">
        <LoadingSpinner />
        <p>Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-list-error">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="course-list-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="course-list">
      <div className="course-grid">
        {courses.map(course => (
          <CourseCard
            key={course._id}
            course={course}
            isEnrolled={isEnrolledView}
            onEnrollmentChange={onEnrollmentChange}
          />
        ))}
      </div>
    </div>
  );
};

export default CourseList;