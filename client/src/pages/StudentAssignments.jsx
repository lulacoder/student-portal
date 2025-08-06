import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAssignmentsByCourse } from '../services/assignmentService.js';
import { getCourses } from '../services/courseService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const courseParam = searchParams.get('course');
    if (courseParam && courses.length > 0) {
      setSelectedCourse(courseParam);
    } else if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0]._id);
    }
  }, [courses, searchParams]);

  useEffect(() => {
    if (selectedCourse) {
      fetchAssignments();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data || []);
    } catch (err) {
      setError('Failed to load courses');
      console.error('Error fetching courses:', err);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedCourse) return;
    
    setLoading(true);
    try {
      const response = await getAssignmentsByCourse(selectedCourse);
      setAssignments(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load assignments');
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const submission = assignment.submission;

    if (submission) {
      if (submission.isGraded) {
        return <span className="badge badge-success">Graded</span>;
      }
      return <span className="badge badge-info">Submitted</span>;
    }

    if (now > dueDate) {
      return <span className="badge badge-danger">Overdue</span>;
    }

    const timeDiff = dueDate.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysUntilDue <= 1) {
      return <span className="badge badge-warning">Due Soon</span>;
    }

    return <span className="badge badge-secondary">Pending</span>;
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (daysUntilDue < 0) {
      return `${formattedDate} (${Math.abs(daysUntilDue)} days overdue)`;
    } else if (daysUntilDue === 0) {
      return `${formattedDate} (Due today)`;
    } else if (daysUntilDue === 1) {
      return `${formattedDate} (Due tomorrow)`;
    } else {
      return `${formattedDate} (${daysUntilDue} days remaining)`;
    }
  };

  if (loading && assignments.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="assignments-page">
      <div className="page-header">
        <h1>My Assignments</h1>
        <p>View and submit your course assignments</p>
      </div>
      {courses.length > 0 && (
        <div className="course-filter">
          <label htmlFor="course-select">Filter by Course:</label>
          <select
            id="course-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="form-select"
          >
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <h3>No assignments found</h3>
          <p>There are no assignments for the selected course.</p>
        </div>
      ) : (
        <div className="assignments-list">
          {assignments.map(assignment => (
            <div key={assignment._id} className="assignment-card">
              <div className="assignment-header">
                <h3 className="assignment-title">{assignment.title}</h3>
                {getStatusBadge(assignment)}
              </div>
              
              <div className="assignment-meta">
                <div className="assignment-due">
                  <strong>Due:</strong> {formatDueDate(assignment.dueDate)}
                </div>
                <div className="assignment-points">
                  <strong>Points:</strong> {assignment.pointValue}
                </div>
              </div>

              <div className="assignment-description">
                <p>{(assignment.description || '').substring(0, 150)}...</p>
              </div>

              {assignment.submission && (
                <div className="submission-info">
                  <div className="submission-meta">
                    <span>Submitted: {new Date(assignment.submission.submittedAt).toLocaleDateString()}</span>
                    {assignment.submission.isLate && (
                      <span className="late-indicator">Late Submission</span>
                    )}
                  </div>
                  {assignment.submission.isGraded && (
                    <div className="grade-info">
                      <strong>Grade: {assignment.submission.grade}/{assignment.pointValue}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="assignment-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/student/assignments/${assignment._id}`)}
                >
                  {assignment.submission ? 'View Submission' : 'Submit Assignment'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;