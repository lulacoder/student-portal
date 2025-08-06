import { useState, useEffect } from 'react';
import { getStudentGrades } from '../services/assignmentService.js';
import { useAuth } from '../hooks/useAuth.js';

const AssignmentProgress = ({ courseId = null, compact = false }) => {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchProgressData();
    }
  }, [user?.id, courseId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await getStudentGrades(user.id);
      
      let filteredData = response.data;
      
      // Filter by course if courseId is provided
      if (courseId && filteredData.gradesByCourse) {
        const courseGrades = filteredData.gradesByCourse[courseId];
        if (courseGrades) {
          filteredData = {
            ...filteredData,
            gradesByCourse: { [courseId]: courseGrades },
            totalAssignments: courseGrades.assignments.length,
            averagePercentage: courseGrades.averagePercentage,
            totalPointsEarned: courseGrades.totalPointsEarned,
            totalPointsPossible: courseGrades.totalPointsPossible
          };
        } else {
          filteredData = {
            totalAssignments: 0,
            averagePercentage: 0,
            totalPointsEarned: 0,
            totalPointsPossible: 0,
            gradesByCourse: {}
          };
        }
      }
      
      setProgressData(filteredData);
      setError('');
    } catch (err) {
      setError('Failed to load progress data');
      console.error('Error fetching progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'grade-a';
    if (percentage >= 80) return 'grade-b';
    if (percentage >= 70) return 'grade-c';
    if (percentage >= 60) return 'grade-d';
    return 'grade-f';
  };

  const getProgressStats = () => {
    if (!progressData) return null;

    const stats = {
      completed: 0,
      pending: 0,
      overdue: 0,
      graded: 0
    };

    if (progressData.gradesByCourse) {
      Object.values(progressData.gradesByCourse).forEach(courseData => {
        courseData.assignments.forEach(assignment => {
          if (assignment.isGraded) {
            stats.graded++;
          } else {
            stats.pending++;
          }
          stats.completed++;
        });
      });
    }

    return stats;
  };

  const renderCompactView = () => {
    const stats = getProgressStats();
    if (!stats) return null;

    return (
      <div className="assignment-progress-compact">
        <div className="progress-header">
          <h4>Assignment Progress</h4>
          {progressData.averagePercentage > 0 && (
            <span className={`grade-badge ${getGradeColor(progressData.averagePercentage)}`}>
              {Math.round(progressData.averagePercentage)}%
            </span>
          )}
        </div>
        
        <div className="progress-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.graded}</span>
            <span className="stat-label">Graded</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        {progressData.totalPointsPossible > 0 && (
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(progressData.totalPointsEarned / progressData.totalPointsPossible) * 100}%` 
              }}
            />
            <span className="progress-text">
              {progressData.totalPointsEarned}/{progressData.totalPointsPossible} points
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderFullView = () => {
    const stats = getProgressStats();
    if (!stats) return null;

    return (
      <div className="assignment-progress-full">
        <div className="progress-header">
          <h3>Assignment Progress Overview</h3>
          {progressData.averagePercentage > 0 && (
            <div className="overall-grade">
              <span className="grade-label">Overall Grade:</span>
              <span className={`grade-value ${getGradeColor(progressData.averagePercentage)}`}>
                {Math.round(progressData.averagePercentage)}%
              </span>
            </div>
          )}
        </div>

        <div className="progress-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-number">{progressData.totalAssignments}</div>
              <div className="card-label">Total Assignments</div>
            </div>
            <div className="summary-card completed">
              <div className="card-number">{stats.completed}</div>
              <div className="card-label">Completed</div>
            </div>
            <div className="summary-card graded">
              <div className="card-number">{stats.graded}</div>
              <div className="card-label">Graded</div>
            </div>
            <div className="summary-card pending">
              <div className="card-number">{stats.pending}</div>
              <div className="card-label">Pending Grade</div>
            </div>
          </div>

          {progressData.totalPointsPossible > 0 && (
            <div className="points-summary">
              <h4>Points Summary</h4>
              <div className="points-bar">
                <div 
                  className="points-earned"
                  style={{ 
                    width: `${(progressData.totalPointsEarned / progressData.totalPointsPossible) * 100}%` 
                  }}
                />
              </div>
              <div className="points-text">
                {progressData.totalPointsEarned} out of {progressData.totalPointsPossible} points earned
                ({Math.round((progressData.totalPointsEarned / progressData.totalPointsPossible) * 100)}%)
              </div>
            </div>
          )}
        </div>

        {progressData.gradesByCourse && Object.keys(progressData.gradesByCourse).length > 1 && (
          <div className="course-breakdown">
            <h4>Course Breakdown</h4>
            <div className="course-list">
              {Object.entries(progressData.gradesByCourse).map(([courseId, courseData]) => (
                <div key={courseId} className="course-item">
                  <div className="course-name">{courseData.courseName}</div>
                  <div className="course-stats">
                    <span className="assignments-count">
                      {courseData.assignments.length} assignments
                    </span>
                    {courseData.averagePercentage > 0 && (
                      <span className={`course-grade ${getGradeColor(courseData.averagePercentage)}`}>
                        {Math.round(courseData.averagePercentage)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="assignment-progress-loading">
        <div className="loading-text">Loading progress...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignment-progress-error">
        <div className="error-text">{error}</div>
        <button className="btn btn-sm btn-outline" onClick={fetchProgressData}>
          Retry
        </button>
      </div>
    );
  }

  if (!progressData || progressData.totalAssignments === 0) {
    return (
      <div className="assignment-progress-empty">
        <div className="empty-text">No assignment data available</div>
      </div>
    );
  }

  return compact ? renderCompactView() : renderFullView();
};

export default AssignmentProgress;