import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FileUpload, type FileUploadFile } from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'Components/FileUpload',
  component: FileUpload,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    maxFiles: {
      control: 'number',
    },
    maxSize: {
      control: 'number',
    },
    accept: {
      control: 'text',
    },
    enableDragDrop: {
      control: 'boolean',
    },
    showFileList: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    uploading: {
      control: 'boolean',
    },
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive component wrapper for stories that need state
const FileUploadWithState = (props: Parameters<typeof FileUpload>[0]) => {
  const [files, setFiles] = useState<FileUploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFilesChange = (selectedFiles: File[]) => {
    const newFiles: FileUploadFile[] = selectedFiles.map((file, index) => ({
      file,
      id: `file-${Date.now()}-${index}`,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const simulateUpload = async () => {
    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }

    setUploading(false);

    // Update files to success status
    setFiles(prev => prev.map(file => ({
      ...file,
      status: 'success' as const,
    })));
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <FileUpload
        {...props}
        files={files}
        uploading={uploading}
        progress={progress}
        onFilesChange={handleFilesChange}
        onUpload={simulateUpload}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args) => <FileUploadWithState {...args} />,
  args: {
    buttonText: 'Choose files',
    dragText: 'Drag and drop files here',
    hintText: 'Select files to upload',
  },
};

export const ImageOnly: Story = {
  render: (args) => <FileUploadWithState {...args} />,
  args: {
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB
    buttonText: 'Choose images',
    dragText: 'Drag and drop images here',
    hintText: 'JPG, PNG, GIF up to 5MB',
  },
};

export const SingleFile: Story = {
  render: (args) => <FileUploadWithState {...args} />,
  args: {
    maxFiles: 1,
    accept: '.pdf,.doc,.docx',
    buttonText: 'Choose document',
    dragText: 'Drag and drop a document here',
    hintText: 'PDF, DOC, DOCX files only',
  },
};

export const WithProgress: Story = {
  args: {
    uploading: true,
    progress: 65,
    buttonText: 'Choose files',
    dragText: 'Drag and drop files here',
  },
};

export const WithError: Story = {
  args: {
    error: 'Upload failed. Please try again.',
    buttonText: 'Choose files',
    dragText: 'Drag and drop files here',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    buttonText: 'Choose files',
    dragText: 'Drag and drop files here',
    hintText: 'File upload is currently disabled',
  },
};

export const NoDragDrop: Story = {
  render: (args) => <FileUploadWithState {...args} />,
  args: {
    enableDragDrop: false,
    buttonText: 'Browse files',
    hintText: 'Click to select files',
  },
};

export const WithFileList: Story = {
  args: {
    showFileList: true,
    files: [
      {
        file: new File([''], 'document.pdf', { type: 'application/pdf' }),
        id: 'file-1',
        status: 'success',
      },
      {
        file: new File([''], 'image.jpg', { type: 'image/jpeg' }),
        id: 'file-2',
        status: 'uploading',
        progress: 45,
      },
      {
        file: new File([''], 'large-file.zip', { type: 'application/zip' }),
        id: 'file-3',
        status: 'error',
        error: 'File too large',
      },
      {
        file: new File([''], 'pending.txt', { type: 'text/plain' }),
        id: 'file-4',
        status: 'pending',
      },
    ],
  },
};

export const DragOverState: Story = {
  render: (args) => {
    return (
      <div
        style={{ maxWidth: '500px' }}
        onDragOver={(e) => e.preventDefault()}
      >
        <FileUpload {...args} />
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          Drag a file over the upload area to see the drag-over state.
        </p>
      </div>
    );
  },
  args: {
    buttonText: 'Choose files',
    dragText: 'Drop files here!',
  },
};

export const LargeFileLimit: Story = {
  render: (args) => <FileUploadWithState {...args} />,
  args: {
    maxSize: 1024 * 1024, // 1MB
    maxFiles: 5,
    buttonText: 'Choose files',
    dragText: 'Drag and drop files here',
    hintText: 'Maximum 5 files, 1MB each',
  },
};
