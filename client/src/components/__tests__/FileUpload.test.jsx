import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import FileUpload from '../FileUpload.jsx';

describe('FileUpload', () => {
  const mockOnFilesChange = vi.fn();
  const defaultProps = {
    files: [],
    onFilesChange: mockOnFilesChange,
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  };

  beforeEach(() => {
    mockOnFilesChange.mockClear();
  });

  it('renders file upload component', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum 5 files/i)).toBeInTheDocument();
  });

  it('opens file dialog when drop zone is clicked', () => {
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    const dropZone = screen.getByText(/drag and drop files here/i).closest('.file-drop-zone');
    fireEvent.click(dropZone);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles file selection through input', () => {
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(mockOnFilesChange).toHaveBeenCalledWith([file]);
  });

  it('displays selected files', () => {
    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
    ];
    
    render(<FileUpload {...defaultProps} files={files} />);
    
    expect(screen.getByText('Selected Files (2/5)')).toBeInTheDocument();
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.pdf')).toBeInTheDocument();
  });

  it('removes file when remove button is clicked', () => {
    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
    ];
    
    render(<FileUpload {...defaultProps} files={files} />);
    
    const removeButtons = screen.getAllByLabelText(/remove/i);
    fireEvent.click(removeButtons[0]);
    
    expect(mockOnFilesChange).toHaveBeenCalledWith([files[1]]);
  });

  it('shows error for files exceeding max size', () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
    
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    expect(screen.getByText(/file "large.txt" is too large/i)).toBeInTheDocument();
    expect(mockOnFilesChange).not.toHaveBeenCalled();
  });

  it('shows error when exceeding max file count', () => {
    const existingFiles = Array.from({ length: 5 }, (_, i) => 
      new File([`content${i}`], `file${i}.txt`, { type: 'text/plain' })
    );
    const newFile = new File(['new content'], 'new.txt', { type: 'text/plain' });
    
    render(<FileUpload {...defaultProps} files={existingFiles} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [newFile] } });
    
    expect(screen.getByText(/cannot upload more than 5 files/i)).toBeInTheDocument();
  });

  it('prevents duplicate files', () => {
    const existingFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const duplicateFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    render(<FileUpload {...defaultProps} files={[existingFile]} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [duplicateFile] } });
    
    expect(screen.getByText(/file "test.txt" is already selected/i)).toBeInTheDocument();
  });

  it('handles drag and drop events', () => {
    render(<FileUpload {...defaultProps} />);
    
    const dropZone = screen.getByText(/drag and drop files here/i).closest('.file-drop-zone');
    const file = new File(['content'], 'dropped.txt', { type: 'text/plain' });
    
    // Simulate drag enter
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass('drag-active');
    
    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });
    
    expect(mockOnFilesChange).toHaveBeenCalledWith([file]);
    expect(dropZone).not.toHaveClass('drag-active');
  });

  it('formats file sizes correctly', () => {
    const files = [
      new File(['x'.repeat(1024)], 'small.txt', { type: 'text/plain' }),
      new File(['x'.repeat(1024 * 1024)], 'medium.txt', { type: 'text/plain' })
    ];
    
    render(<FileUpload {...defaultProps} files={files} />);
    
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });
});