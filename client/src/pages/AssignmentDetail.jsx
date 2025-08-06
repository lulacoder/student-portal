import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssignment, submitAssignment, downloadFile } from '../services/assignmentService.js';
import { useAuth } from '../hooks/useAuth.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import FileUpload from '../components/FileUpload.jsx';

const AssignmentDetail = () => {
  const [assignment, setAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  useAuth();

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await getAssignment(assignmentId);
      setAssignment(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load assignment details');
      console.error('Error fetching assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!submissionText.trim() && files.length === 0) {
      setError('Please provide either submission text or upload files');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('submissionText', submissionText);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      await submitAssignment(assignmentId, formData);
      setSuccess('Assignment submitted successfully!');
      
      // Refresh assignment data to show submission
      setTimeout(() => {
        fetchAssignment();
        setSuccess('');
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit assignment');
      console.error('Error submitting assignment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileDownload = async (fileId, fileName) => {
    try {
      const response = await downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  const canSubmit = () => {
    if (!assignment) return false;
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    return assignment.isActive && now <= dueDate;
  };

  const isOverdue = () => {
    if (!assignment) return false;
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    return now > dueDate;
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!assignment) {
    return (
      <div className="error-state">
        <h2>Assignment not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/student/assignments')}>
          Back to Assignments
        </button>
      </div>
    );
  }

  const hasSubmission = assignment.submission;

  return (
    <div className="assignment-detail">
      <div className="assignment-header">
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/student/assignments')}
        >
          ← Back to Assignments
        </button>
        
        <div className="assignment-title-section">
          <h1>{assignment.title}</h1>
          <div className="assignment-meta">
            <span className="course-name">{assignment.course?.name}</span>
            <span className="points">Worth {assignment.pointValue} points</span>
          </div>
        </div>
      </div>

      <div className="assignment-content">
        <div className="assignment-info">
          <div className="due-date-section">
            <h3>Due Date</h3>
            <p className={isOverdue() ? 'overdue' : ''}>
              {formatDueDate(assignment.dueDate)}
              {isOverdue() && <span className="overdue-label"> (Overdue)</span>}
            </p>
          </div>

          <div className="description-section">
            <h3>Description</h3>
            <div className="description-content">
              {assignment.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="attachments-section">
              <h3>Assignment Files</h3>
              <div className="file-list">
                {assignment.attachments.map((attachment, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{attachment.name}</span>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleFileDownload(attachment.fileId._id, attachment.name)}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="submission-section">
          {hasSubmission ? (
            <div className="existing-submission">
              <h3>Your Submission</h3>
              
              <div className="submission-status">
                <div className="status-item">
                  <strong>Submitted:</strong> {new Date(assignment.submission.submittedAt).toLocaleString()}
                </div>
                {assignment.submission.isLate && (
                  <div className="status-item late">
                    <strong>Status:</strong> Late Submission
                  </div>
                )}
                {assignment.submission.isGraded ? (
                  <div className="status-item graded">
                    <strong>Grade:</strong> {assignment.submission.grade}/{assignment.pointValue}
                    {assignment.submission.feedback && (
                      <div className="feedback">
                        <strong>Feedback:</strong>
                        <p>{assignment.submission.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="status-item pending">
                    <strong>Status:</strong> Awaiting Grade
                  </div>
                )}
              </div>

              {assignment.submission.submissionText && (
                <div className="submission-text">
                  <h4>Submission Text</h4>
                  <div className="text-content">
                    {assignment.submission.submissionText.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              {assignment.submission.attachments && assignment.submission.attachments.length > 0 && (
                <div className="submission-files">
                  <h4>Submitted Files</h4>
                  <div className="file-list">
                    {assignment.submission.attachments.map((attachment, index) => (
                      <div key={index} className="file-item">
                        <span className="file-name">{attachment.name}</span>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleFileDownload(attachment.fileId._id, attachment.name)}
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canSubmit() && (
                <div className="resubmission-section">
                  <h4>Resubmit Assignment</h4>
                  <p className="resubmission-note">
                    You can resubmit this assignment before the due date. Your previous submission will be replaced.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="new-submission">
              <h3>Submit Assignment</h3>
              {!canSubmit() && (
                <div className="alert alert-warning">
                  This assignment is no longer accepting submissions.
                </div>
              )}
            </div>
          )}

          {canSubmit() && (
            <form onSubmit={handleSubmit} className="submission-form">
              <div className="form-group">
                <label htmlFor="submissionText">Submission Text</label>
                <textarea
                  id="submissionText"
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter your submission text here..."
                  rows="8"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>File Attachments</label>
                <FileUpload
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024} // 10MB
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  {success}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || (!submissionText.trim() && files.length === 0)}
                >
                  {submitting ? 'Submitting...' : hasSubmission ? 'Resubmit Assignment' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;