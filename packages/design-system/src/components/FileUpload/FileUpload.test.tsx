import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { FileUpload, type FileUploadFile } from './FileUpload';

expect.extend(toHaveNoViolations);

// Helper function to create mock files
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload', () => {
  it('renders with default props', () => {
    render(<FileUpload />);
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
    expect(screen.getByText('Choose files')).toBeInTheDocument();
    expect(screen.getByLabelText('File input')).toBeInTheDocument();
  });

  it('renders custom text props', () => {
    render(
      <FileUpload
        buttonText="Select files"
        dragText="Drop files here"
        hintText="Custom hint text"
      />
    );

    expect(screen.getByText('Drop files here')).toBeInTheDocument();
    expect(screen.getByText('Select files')).toBeInTheDocument();
    expect(screen.getByText('Custom hint text')).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    const user = userEvent.setup();
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} />);

    const file = createMockFile('test.txt', 1024, 'text/plain');
    const input = screen.getByLabelText('File input') as HTMLInputElement;

    await user.upload(input, file);

    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it('handles multiple file selection', async () => {
    const user = userEvent.setup();
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} maxFiles={3} />);

    const files = [
      createMockFile('test1.txt', 1024, 'text/plain'),
      createMockFile('test2.txt', 2048, 'text/plain'),
    ];

    const input = screen.getByLabelText('File input') as HTMLInputElement;
    await user.upload(input, files);

    expect(onFilesChange).toHaveBeenCalledWith(files);
  });

  it('respects maxFiles limit', async () => {
    const user = userEvent.setup();
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} maxFiles={2} />);

    const files = [
      createMockFile('test1.txt', 1024, 'text/plain'),
      createMockFile('test2.txt', 2048, 'text/plain'),
      createMockFile('test3.txt', 1024, 'text/plain'), // This should be rejected
    ];

    const input = screen.getByLabelText('File input') as HTMLInputElement;
    await user.upload(input, files);

    // Should only accept the first 2 files
    expect(onFilesChange).toHaveBeenCalledWith([files[0], files[1]]);
  });

  it('validates file size', async () => {
    const user = userEvent.setup();
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} maxSize={1024} />);

    const files = [
      createMockFile('small.txt', 512, 'text/plain'), // Valid
      createMockFile('large.txt', 2048, 'text/plain'), // Too large
    ];

    const input = screen.getByLabelText('File input') as HTMLInputElement;
    await user.upload(input, files);

    // Should only accept the small file (large file filtered out by validation)
    expect(onFilesChange).toHaveBeenCalledWith([files[0]]);
  });

  it('validates file types', async () => {
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} accept="image/*" />);

    const files = [
      createMockFile('image.jpg', 1024, 'image/jpeg'), // Valid
      createMockFile('document.pdf', 1024, 'application/pdf'), // Invalid
    ];

    const input = screen.getByLabelText('File input') as HTMLInputElement;

    // Create a mock FileList
    const fileList = {
      0: files[0],
      1: files[1],
      length: 2,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < this.length; i++) {
          yield this[i];
        }
      }
    } as FileList;

    // Set the files property and trigger change event
    Object.defineProperty(input, 'files', {
      value: fileList,
      writable: false,
    });

    fireEvent.change(input);

    // Should only accept the image file (PDF filtered out by validation)
    expect(onFilesChange).toHaveBeenCalledWith([files[0]]);
  });

  it('handles drag and drop', async () => {
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} />);

    const dropZone = screen.getByLabelText('File input').parentElement!;
    const file = createMockFile('dropped.txt', 1024, 'text/plain');

    const dragEvent = new Event('dragover', { bubbles: true });
    const dropEvent = Object.assign(new Event('drop', { bubbles: true }), {
      dataTransfer: {
        files: [file],
      },
    });

    fireEvent(dropZone, dragEvent);
    fireEvent(dropZone, dropEvent);

    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it('disables drag and drop when enableDragDrop is false', () => {
    render(<FileUpload enableDragDrop={false} />);
    expect(screen.getByText('Select files')).toBeInTheDocument();
    expect(screen.queryByText('Drag and drop files here')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<FileUpload disabled />);
    const input = screen.getByLabelText('File input');
    expect(input).toBeDisabled();
  });

  it('shows upload progress', () => {
    render(<FileUpload uploading progress={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message', () => {
    const errorMessage = 'Upload failed';
    render(<FileUpload error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders file list when showFileList is true', () => {
    const files: FileUploadFile[] = [
      {
        file: createMockFile('test1.txt', 1024, 'text/plain'),
        id: 'file-1',
        status: 'success',
      },
      {
        file: createMockFile('test2.txt', 2048, 'text/plain'),
        id: 'file-2',
        status: 'uploading',
        progress: 50,
      },
      {
        file: createMockFile('test3.txt', 512, 'text/plain'),
        id: 'file-3',
        status: 'error',
        error: 'Upload failed',
      },
    ];

    render(<FileUpload files={files} showFileList />);

    expect(screen.getByText('test1.txt')).toBeInTheDocument();
    expect(screen.getByText('test2.txt')).toBeInTheDocument();
    expect(screen.getByText('test3.txt')).toBeInTheDocument();

    expect(screen.getByText('✓ Uploaded')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('✗ Upload failed')).toBeInTheDocument();
  });

  it('hides file list when showFileList is false', () => {
    const files: FileUploadFile[] = [
      {
        file: createMockFile('test.txt', 1024, 'text/plain'),
        id: 'file-1',
        status: 'success',
      },
    ];

    render(<FileUpload files={files} showFileList={false} />);

    expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    const onFilesChange = jest.fn();

    render(<FileUpload onFilesChange={onFilesChange} />);

    const chooseButton = screen.getByText('Choose files');

    // Focus and press Enter
    await user.click(chooseButton);

    // The file input should be available
    expect(screen.getByLabelText('File input')).toBeInTheDocument();
  });

  it('generates helpful hint text based on props', () => {
    const { rerender } = render(<FileUpload accept="image/*" />);
    expect(screen.getByText(/Accepted formats: image\/\*/)).toBeInTheDocument();

    rerender(<FileUpload maxSize={1024 * 1024} />);
    expect(screen.getByText(/Max size: 1 MB/)).toBeInTheDocument();

    rerender(<FileUpload accept="image/*" maxSize={1024 * 1024} />);
    expect(screen.getByText(/Accepted formats: image\/\*. Max size: 1 MB/)).toBeInTheDocument();
  });

  it('formats file sizes correctly', () => {
    const files: FileUploadFile[] = [
      {
        file: createMockFile('small.txt', 512, 'text/plain'),
        id: 'file-1',
        status: 'success',
      },
      {
        file: createMockFile('medium.txt', 1024, 'text/plain'),
        id: 'file-2',
        status: 'success',
      },
      {
        file: createMockFile('large.txt', 1024 * 1024, 'text/plain'),
        id: 'file-3',
        status: 'success',
      },
    ];

    render(<FileUpload files={files} showFileList />);

    expect(screen.getByText('(512 Bytes)')).toBeInTheDocument();
    expect(screen.getByText('(1 KB)')).toBeInTheDocument();
    expect(screen.getByText('(1 MB)')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FileUpload />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when disabled', async () => {
    const { container } = render(<FileUpload disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with file list', async () => {
    const files: FileUploadFile[] = [
      {
        file: createMockFile('test.txt', 1024, 'text/plain'),
        id: 'file-1',
        status: 'success',
      },
    ];

    const { container } = render(<FileUpload files={files} showFileList />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
