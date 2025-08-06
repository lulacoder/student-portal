import { useState, useEffect } from 'react';
import { getAvailableCourses } from '../services/courseService';
import CourseList from '../components/CourseList';

const CourseCatalog = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAvailableCourses();
      setCourses(response.data || []);
    } catch (err) {
      setError(err.error?.message || err.message || 'Failed to load available courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentChange = (courseId, enrolled) => {
    if (enrolled) {
      // Remove course from available courses when enrolled
      setCourses(prev => prev.filter(course => course._id !== courseId));
    }
  };

  // Filter courses based on search and subject
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !selectedSubject || course.subject === selectedSubject;
    
    return matchesSearch && matchesSubject;
  });

  // Get unique subjects for filter dropdown
  const subjects = [...new Set(courses.map(course => course.subject))].sort();

  return (
    <div className="course-catalog">
      <div className="page-header">
        <h1>Course Catalog</h1>
        <p>Browse and enroll in available courses</p>
      </div>

      <div className="course-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="subject-filter"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-results">
          {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <CourseList
        courses={filteredCourses}
        loading={loading}
        error={error}
        isEnrolledView={false}
        onEnrollmentChange={handleEnrollmentChange}
        emptyMessage="No courses available for enrollment"
      />
    </div>
  );
};

export default CourseCatalog;